import { CronJob } from 'cron'
import { db } from '../db/index.js'

function phoneToJid(phone) {
  const clean = phone.replace(/\D/g, '')
  return `${clean}@s.whatsapp.net`
}

function formatReminderMessage(patient, label, category) {
  const timeLabel = label ? ` (${label})` : ''
  switch (category) {
    case 'medication':
      return `Halo ${patient.name}, ini pengingat${timeLabel} dari Posyandu untuk minum obat *${patient.medicine_name}* hari ini.\n\nSetelah minum, silakan balas *SUDAH* atau *BELUM*. Terima kasih!`
    case 'activity':
      return `Halo ${patient.name}! 🏃‍♂️ Sudah beraktivitas fisik hari ini? Jalan kaki, senam, atau olahraga ringan sangat baik untuk kesehatan Anda.\n\nSilakan balas berapa kali: *1*, *2*, atau *3* kali.`
    case 'diet':
      return `Selamat pagi ${patient.name}! 🥗\n\nSudah sarapan sehat hari ini? Pilih makanan bergizi seperti sayur, protein, dan karbohidrat kompleks ya.\n\nBalas *SUDAH* jika sudah makan bergizi, atau *BELUM* jika belum.`
    default:
      return `Halo ${patient.name}, ini pengingat kesehatan dari Posyandu.`
  }
}

function formatGuardianMessage(patient) {
  return `Halo, ini notifikasi dari Posyandu.\n\n*${patient.name}* belum mengonfirmasi minum obat *${patient.medicine_name}* hari ini. Mohon ditindaklanjuti.\n\nTerima kasih!`
}

// Returns the current time in the given IANA timezone as a plain Date object
// whose .getHours()/.getMinutes() reflect that local time.
function getLocalTime(timezone) {
  const now = new Date()
  return new Date(now.toLocaleString('en-US', { timeZone: timezone }))
}

// Returns today's date string (YYYY-MM-DD) in the given timezone.
function getLocalDateStr(timezone) {
  return getLocalTime(timezone).toLocaleDateString('en-CA') // en-CA produces YYYY-MM-DD
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

export function startCronJobs(waService) {
  // ── Dynamic Reminder: every minute ────────────────────────────────────────────
  // Each patient's reminder_time is interpreted in THEIR timezone (p.timezone).
  // The NOT EXISTS check uses p.timezone so scheduled_date comparisons are correct
  // even for WITA/WIT patients near midnight.
  const reminderJob = new CronJob(
    '* * * * *',
    async () => {
      try {
        // Fetch all active reminder slots not yet sent today, per each patient's timezone
        const result = await db.query(`
          SELECT
            p.id AS patient_id,
            p.name,
            p.phone,
            p.medicine_name,
            p.guardian_phone,
            p.timezone,
            pr.id AS reminder_slot_id,
            pr.reminder_time,
            pr.label,
            pr.category
          FROM patients p
          JOIN patient_reminders pr ON pr.patient_id = p.id AND pr.is_active = true
          WHERE p.is_active = true
            AND NOT EXISTS (
              SELECT 1 FROM reminders r
              WHERE r.patient_id    = p.id
                AND r.scheduled_date = (NOW() AT TIME ZONE p.timezone)::date
                AND r.reminder_slot_id = pr.id
                AND r.status = 'sent'
            )
          ORDER BY pr.reminder_time, p.id
        `)

        if (result.rows.length === 0) return

        for (const slot of result.rows) {
          const tz = slot.timezone || 'Asia/Jakarta'
          const localNow      = getLocalTime(tz)
          const currentMinutes = localNow.getHours() * 60 + localNow.getMinutes()
          const slotMinutes    = timeToMinutes(slot.reminder_time)

          // Skip if the slot time hasn't arrived yet in the patient's local timezone
          if (slotMinutes > currentMinutes) continue
          // Only fire within a 5-minute window — prevents retroactive bulk-sending
          // if the backend restarts briefly
          if (currentMinutes - slotMinutes > 5) continue

          // Patient's local date string (YYYY-MM-DD) for scheduled_date storage
          const localDateStr = getLocalDateStr(tz)

          try {
            const jid = phoneToJid(slot.phone)
            const message = formatReminderMessage(slot, slot.label, slot.category)
            await waService.sendMessage(jid, message)
            console.log(`[CRON] Reminder sent → ${slot.name} (${tz}) at ${slot.reminder_time} [${slot.category}]`)

            await db.query(`
              INSERT INTO reminders (patient_id, reminder_slot_id, scheduled_date, sent_at, status, category)
              VALUES ($1, $2, $3::date, NOW(), 'sent', $4)
              ON CONFLICT (patient_id, scheduled_date, reminder_slot_id)
              DO UPDATE SET sent_at = NOW(), status = 'sent'
            `, [slot.patient_id, slot.reminder_slot_id, localDateStr, slot.category])
          } catch (err) {
            console.error(`[CRON] Failed to remind ${slot.name}:`, err.message)
            await db.query(`
              INSERT INTO reminders (patient_id, reminder_slot_id, scheduled_date, status, category)
              VALUES ($1, $2, $3::date, 'failed', $4)
              ON CONFLICT (patient_id, scheduled_date, reminder_slot_id)
              DO UPDATE SET status = 'failed'
            `, [slot.patient_id, slot.reminder_slot_id, localDateStr, slot.category])
          }
        }
      } catch (err) {
        console.error('[CRON] Reminder job error:', err.message)
      }
    },
    null,
    true,
    'Asia/Jakarta'
  )

  // ── Guardian Notification: every 30 min, 08:00–21:00 Jakarta ─────────────────
  // Operational window stays in Jakarta time (system-level decision).
  // "Today" checks use p.timezone per patient for correctness.
  const guardianJob = new CronJob(
    '*/30 * * * *',
    async () => {
      try {
        const jakartaHour = getLocalTime('Asia/Jakarta').getHours()
        if (jakartaHour < 8 || jakartaHour >= 21) return

        const result = await db.query(`
          SELECT DISTINCT ON (p.id)
            p.id, p.name, p.phone, p.medicine_name, p.guardian_phone, p.timezone
          FROM patients p
          JOIN reminders r ON r.patient_id = p.id
            AND r.scheduled_date = (NOW() AT TIME ZONE p.timezone)::date
            AND r.status = 'sent'
            AND r.category = 'medication'
          WHERE p.is_active = true
            AND p.guardian_phone IS NOT NULL
            AND p.guardian_phone != ''
            AND NOT EXISTS (
              SELECT 1 FROM reminders r2
              WHERE r2.patient_id = p.id
                AND r2.scheduled_date = (NOW() AT TIME ZONE p.timezone)::date
                AND r2.category = 'medication'
                AND r2.guardian_notified_at IS NOT NULL
            )
            AND NOT EXISTS (
              SELECT 1 FROM responses resp
              WHERE resp.patient_id = p.id
                AND (resp.responded_at AT TIME ZONE p.timezone)::date = (NOW() AT TIME ZONE p.timezone)::date
                AND resp.response_type = 'medication'
            )
          ORDER BY p.id
        `)

        if (result.rows.length === 0) return

        for (const patient of result.rows) {
          try {
            const jid = phoneToJid(patient.guardian_phone)
            const message = formatGuardianMessage(patient)
            await waService.sendMessage(jid, message)
            console.log(`[CRON] Guardian notified for ${patient.name} → ${patient.guardian_phone}`)

            await db.query(`
              UPDATE reminders
              SET guardian_notified_at = NOW()
              WHERE patient_id = $1
                AND scheduled_date = (NOW() AT TIME ZONE $2)::date
                AND category = 'medication'
            `, [patient.id, patient.timezone || 'Asia/Jakarta'])
          } catch (err) {
            console.error(`[CRON] Failed to notify guardian for ${patient.name}:`, err.message)
          }
        }
      } catch (err) {
        console.error('[CRON] Guardian job error:', err.message)
      }
    },
    null,
    true,
    'Asia/Jakarta'
  )

  // ── Motivation Message: every 5 minutes ───────────────────────────────────────
  const motivationJob = new CronJob(
    '*/5 * * * *',
    async () => {
      try {
        const result = await db.query(`
          SELECT p.id, p.name, p.phone, p.medicine_name, p.timezone, s.id AS score_id
          FROM patient_daily_scores s
          JOIN patients p ON p.id = s.patient_id
          WHERE s.score_date    = (NOW() AT TIME ZONE p.timezone)::date
            AND s.all_positive  = true
            AND s.motivation_sent = false
            AND p.is_active     = true
        `)

        for (const patient of result.rows) {
          // Atomic claim — prevents double-send if two cron ticks overlap
          const claimed = await db.query(`
            UPDATE patient_daily_scores
               SET motivation_sent = true
             WHERE id = $1 AND motivation_sent = false
            RETURNING id
          `, [patient.score_id])

          if (claimed.rowCount === 0) continue

          try {
            const jid = phoneToJid(patient.phone)
            const message = `Luar biasa ${patient.name}! 🎉🌟\n\nKamu sudah menyelesaikan semua target kesehatan hari ini:\n✅ Minum obat\n✅ Aktivitas fisik\n✅ Makan bergizi\n\nKonsistensi seperti ini yang membuat kamu semakin sehat. Pertahankan terus ya! 💪`
            await waService.sendMessage(jid, message)
            console.log(`[CRON] Motivation message sent to ${patient.name}`)
          } catch (err) {
            console.error(`[CRON] Failed to send motivation to ${patient.name}:`, err.message)
            // Roll back the claim so it retries next tick
            await db.query('UPDATE patient_daily_scores SET motivation_sent = false WHERE id = $1', [patient.score_id])
          }
        }
      } catch (err) {
        console.error('[CRON] Motivation job error:', err.message)
      }
    },
    null,
    true,
    'Asia/Jakarta'
  )

  console.log('[CRON] Reminder scheduled (every minute, per-patient timezone)')
  console.log('[CRON] Guardian notification scheduled (every 30 min, 08:00-21:00, medication-only)')
  console.log('[CRON] Motivation message scheduled (every 5 min)')
}
