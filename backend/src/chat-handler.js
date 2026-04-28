import { db } from './db/index.js'
import { upsertDailyScore } from './mcp/server.js'
import { handleWithAI } from './ai-agent.js'

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

function replyForMedication(patient, answer) {
  const { name, medicine_name } = patient
  if (answer === 'YES') {
    return `Terima kasih ${name}! 🎉 Keren banget sudah minum obat *${medicine_name}* hari ini. Tetap semangat menjaga kesehatan ya! 💪`
  }
  if (answer === 'NO') {
    return `Halo ${name}, jangan lupa minum obat *${medicine_name}* ya! 🙏 Obat diminum secara rutin sangat penting untuk pemulihan. Semangat! 💊`
  }
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

    // 3. Quick path: clear medication response keywords → bypass AI for speed
    const medAnswer = parseMedicationAnswer(text)
    if (medAnswer) {
      const reminderRes = await db.query(
        `SELECT id FROM reminders WHERE patient_id = $1 AND scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date AND category = $2`,
        [patientId, 'medication']
      )
      const reminderId = reminderRes.rows[0]?.id ?? null

      await db.query(
        'INSERT INTO responses (patient_id, reminder_id, answer, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
        [patientId, reminderId, medAnswer, text, 'medication']
      )
      console.log(`[CHAT] Medication response recorded: ${medAnswer} for patient ${patientId}`)

      await upsertDailyScore(patientId)
      return replyForMedication(patient, medAnswer)
    }

    // 4. Everything else → OpenAI agent
    console.log(`[CHAT] Delegating to AI for message from ${name}`)
    return await handleWithAI(patient, text)

  } catch (err) {
    console.error('[CHAT] Error:', err.message)
    return 'Maaf, terjadi kesalahan sistem. Silakan coba lagi nanti.'
  }
}
