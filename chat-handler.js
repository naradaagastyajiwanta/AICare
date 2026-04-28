import { db } from './db/index.js'

const YES_KEYWORDS = ['sudah', 'udah', 'iya', 'ya', '✅', 'done', 'diminum', 'oke', 'ok', 'yes']
const NO_KEYWORDS = ['belum', 'blm', 'tidak', 'nggak', 'gak', 'ga ', '❌', 'belum minum', 'no', 'gk', 'tdk']

function parseAnswer(text) {
  const lower = text.toLowerCase().trim()
  // Check NO first — phrases like "belum minum" should be NO, not YES
  if (NO_KEYWORDS.some(k => lower.includes(k))) return 'NO'
  if (YES_KEYWORDS.some(k => lower.includes(k))) return 'YES'
  return 'UNCLEAR'
}

export async function handleChatMessage(phone, text, waService) {
  console.log(`[CHAT] From ${phone}: ${text}`)

  // Strip + prefix if present
  const cleanPhone = phone.replace(/^\+/, '')

  try {
    // 1. Look up patient
    const patientRes = await db.query(
      'SELECT id, name, medicine_name, guardian_name, reminder_time FROM patients WHERE phone = $1 AND is_active = true',
      [cleanPhone]
    )

    if (patientRes.rows.length === 0) {
      console.log(`[CHAT] Patient not found: ${cleanPhone}`)
      return 'Maaf, nomor Anda belum terdaftar di sistem kami. Silakan hubungi petugas Posyandu.'
    }

    const patient = patientRes.rows[0]
    const { id: patientId, name, medicine_name, reminder_time } = patient

    // 2. Check if asking about medicine/reminder
    const lowerText = text.toLowerCase()
    if (lowerText.includes('kapan') || lowerText.includes('jam') || lowerText.includes('obat apa')) {
      return `Halo ${name}! Anda minum obat *${medicine_name}* setiap hari pukul *${reminder_time}*. Jangan lupa ya! 😊`
    }

    // 3. Parse answer
    const answer = parseAnswer(text)
    console.log(`[CHAT] Parsed answer for ${name}: ${answer}`)

    // 4. Find today's medication reminder (must filter by category to avoid
    //    attaching a medication answer to a same-day activity/diet reminder row)
    const reminderRes = await db.query(
      'SELECT id FROM reminders WHERE patient_id = $1 AND scheduled_date = CURRENT_DATE AND category = $2',
      [patientId, 'medication']
    )
    const reminderId = reminderRes.rows[0]?.id ?? null

    // 5. Record response
    await db.query(
      'INSERT INTO responses (patient_id, reminder_id, answer, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
      [patientId, reminderId, answer, text, 'medication']
    )
    console.log(`[CHAT] Response recorded: ${answer} for patient ${patientId}`)

    // 6. Reply based on answer
    if (answer === 'YES') {
      return `Alhamdulillah, terima kasih sudah minum obat *${medicine_name}* hari ini! 🎉\nTetap semangat dan jaga kesehatan ya, ${name}! 💪`
    }

    if (answer === 'NO') {
      return `Baik, terima kasih sudah jujur ya ${name} 🙏\nJangan lupa minum obat *${medicine_name}*-nya nanti ya!\nKalau ada kendala atau efek samping, segera hubungi petugas Posyandu.`
    }

    // UNCLEAR
    return `Halo ${name}! Apakah Anda sudah minum obat *${medicine_name}* hari ini?\nBalas *SUDAH* atau *BELUM* ya 😊`

  } catch (err) {
    console.error('[CHAT] Error:', err.message)
    return 'Maaf, terjadi kesalahan sistem. Silakan coba lagi nanti.'
  }
}
