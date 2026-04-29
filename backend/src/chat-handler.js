import { db } from './db/index.js'
import { upsertDailyScore } from './mcp/server.js'
import { handleWithAI, generateQuickReply } from './ai-agent.js'

const YES_KEYWORDS = ['sudah', 'udah', 'iya', 'ya', '✅', 'done', 'diminum', 'oke', 'ok', 'yes']
const NO_KEYWORDS = ['belum', 'blm', 'tidak', 'nggak', 'gak', 'ga', '❌', 'belum minum', 'no', 'gk', 'tdk']

// Use word-boundary matching for alphabetic keywords to avoid substring false positives
// (e.g. 'ya' inside 'obatnya', 'ga' inside 'gaga').
// Emoji/special-char keywords fall back to plain includes.
function matchesKeyword(text, keyword) {
  const kw = keyword.trim()
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (/^[a-zA-Z]+$/.test(kw)) {
    return new RegExp('\\b' + escaped + '\\b').test(text)
  }
  return text.includes(kw)
}

function parseMedicationAnswer(text) {
  const lower = text.toLowerCase().trim()
  const isNo  = NO_KEYWORDS.some(k => matchesKeyword(lower, k))
  const isYes = YES_KEYWORDS.some(k => matchesKeyword(lower, k))
  if (isYes && !isNo) return 'YES'
  if (isNo && !isYes) return 'NO'
  if (isYes && isNo)  return 'UNCLEAR'
  return null
}

/**
 * Returns true only when the message looks like a direct YES/NO answer,
 * not a longer sentence that happens to contain a keyword mid-clause
 * (e.g. "okei terima kasih sudah mengingatkan" is NOT a direct answer).
 *
 * Rules:
 *   - ≤ 4 words → always a direct answer
 *   - > 4 words → only if a YES/NO keyword appears within the first 2 words
 */
function isDirectAnswer(text) {
  const words = text.toLowerCase().trim().split(/\s+/)
  if (words.length <= 4) return true
  const firstTwo = words.slice(0, 2).join(' ')
  return YES_KEYWORDS.some(k => matchesKeyword(firstTwo, k)) ||
         NO_KEYWORDS.some(k => matchesKeyword(firstTwo, k))
}

function replyForCategory(patient, answer, category) {
  const { name, medicine_name } = patient

  if (category === 'diet') {
    if (answer === 'YES') return `Hebat ${name}! 🥗 Keren banget sudah makan bergizi hari ini. Tubuh sehat dimulai dari makanan yang baik! 💪`
    if (answer === 'NO')  return `Halo ${name}, jangan lupa makan makanan bergizi ya! 🥗 Pilih sayur, protein, dan karbohidrat kompleks untuk mendukung kesehatanmu. Semangat! 💪`
    return `Halo ${name}, sudah makan bergizi hari ini? Balas *SUDAH* atau *BELUM* ya 😊`
  }

  if (category === 'activity') {
    if (answer === 'YES') return `Mantap ${name}! 🏃 Luar biasa sudah beraktivitas fisik hari ini. Terus jaga kebugaran ya! 💪`
    if (answer === 'NO')  return `Halo ${name}, jangan lupa beraktivitas fisik ya! 🏃 Aktivitas ringan seperti jalan kaki juga sudah sangat bagus. Semangat! 💪`
    return `Halo ${name}, sudah beraktivitas fisik hari ini? Balas *SUDAH* atau *BELUM* ya 😊`
  }

  // medication (default)
  if (answer === 'YES') return `Terima kasih ${name}! 🎉 Keren banget sudah minum obat *${medicine_name}* hari ini. Tetap semangat menjaga kesehatan ya! 💪`
  if (answer === 'NO')  return `Halo ${name}, jangan lupa minum obat *${medicine_name}* ya! 🙏 Obat diminum secara rutin sangat penting untuk pemulihan. Semangat! 💊`
  return `Halo ${name}, kami kurang yakin apakah kamu sudah minum obat *${medicine_name}* hari ini. Bisa balas *SUDAH* atau *BELUM* ya? 😊`
}

export async function handleChatMessage(phone, text, waService) {
  console.log(`[CHAT] From ${phone}: ${text}`)

  const cleanPhone = phone.replace(/^\+/, '')

  try {
    // 1. Look up patient
    const patientRes = await db.query(
      'SELECT id, name, medicine_name, guardian_name, reminder_time FROM patients WHERE phone = $1 AND is_active = true',
      [cleanPhone]
    )

    if (patientRes.rows.length === 0) {
      console.log(`[CHAT] Patient not found: ${cleanPhone}`)
      return 'Maaf, nomor Anda belum terdaftar di sistem kami. Silakan hubungi petugas Posyandu untuk mendaftar. 🙏'
    }

    const patient = patientRes.rows[0]
    const { id: patientId, name } = patient

    // 2. Schedule question → static template
    const lowerText = text.toLowerCase()
    if (lowerText.includes('kapan') || lowerText.includes('jam') || lowerText.includes('obat apa') || lowerText.includes('jadwal')) {
      const slots = await db.query(
        `SELECT reminder_time, label, category FROM patient_reminders
         WHERE patient_id = $1 AND is_active = true ORDER BY reminder_time`,
        [patientId]
      )
      if (slots.rows.length > 0) {
        const lines = slots.rows.map(s => {
          const cat = s.category === 'medication' ? '💊 Obat' : s.category === 'activity' ? '🏃 Aktivitas' : '🥗 Makan'
          const label = s.label ? ` (${s.label})` : ''
          return `• ${cat}${label}: pukul *${s.reminder_time.slice(0, 5)}* WIB`
        }).join('\n')
        return `Halo ${name}! 📋 Jadwal pengingat kamu:\n${lines}\n\nJangan sampai terlewat ya!`
      }
      const time = (patient.reminder_time ?? '08:00').slice(0, 5)
      return `Halo ${name}! 📋 Jadwal minum obat *${patient.medicine_name}* setiap hari pukul *${time}* WIB. Jangan sampai terlewat ya! 💊`
    }

    // 3. Quick path: short direct YES/NO reply → bypass AI for speed
    const answer = parseMedicationAnswer(text)
    if (answer && isDirectAnswer(text)) {
      // Determine category from most recently sent reminder today
      const recentReminder = await db.query(
        `SELECT id, category FROM reminders
         WHERE patient_id = $1
           AND scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
           AND status = 'sent'
         ORDER BY sent_at DESC NULLS LAST LIMIT 1`,
        [patientId]
      )
      const category   = recentReminder.rows[0]?.category ?? 'medication'
      const reminderId = recentReminder.rows[0]?.id ?? null

      await db.query(
        'INSERT INTO responses (patient_id, reminder_id, answer, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
        [patientId, reminderId, answer, text, category]
      )
      console.log(`[CHAT] ${category} response recorded: ${answer} for patient ${patientId}`)

      await upsertDailyScore(patientId)
      const llmReply = await generateQuickReply(patient, answer, category)
      return llmReply ?? replyForCategory(patient, answer, category)
    }

    // 4. Everything else → OpenAI agent
    console.log(`[CHAT] Delegating to AI for message from ${name}`)
    return await handleWithAI(patient, text)

  } catch (err) {
    console.error('[CHAT] Error:', err.message)
    return 'Maaf, terjadi kesalahan sistem. Silakan coba lagi nanti.'
  }
}
