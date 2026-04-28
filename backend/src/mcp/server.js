import { z } from 'zod'
import { db } from '../db/index.js'

// ─── Score Calculation Helper ─────────────────────────────────────────────────

export async function upsertDailyScore(patientId) {
  const reports = await db.query(`
    SELECT response_type, answer, activity_count, ate_healthy, medication_count
    FROM responses
    WHERE patient_id = $1
      AND (responded_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
  `, [patientId])

  let medScore = 0, actScore = 0, dietScore = 0

  for (const r of reports.rows) {
    if (r.response_type === 'medication' && r.answer === 'YES') medScore = 100
    if (r.response_type === 'activity') {
      if ((r.activity_count ?? 0) >= 2) actScore = 100
      else if ((r.activity_count ?? 0) === 1) actScore = 50
    }
    if (r.response_type === 'diet' && r.ate_healthy === true) dietScore = 100
  }

  const total = medScore + actScore + dietScore
  const allPositive = medScore === 100 && actScore >= 50 && dietScore === 100

  await db.query(`
    INSERT INTO patient_daily_scores (patient_id, score_date, medication_score, activity_score, diet_score, total_score, all_positive)
    VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::date, $2, $3, $4, $5, $6)
    ON CONFLICT (patient_id, score_date)
    DO UPDATE SET medication_score=$2, activity_score=$3, diet_score=$4, total_score=$5, all_positive=$6
  `, [patientId, medScore, actScore, dietScore, total, allPositive])

  return { allPositive, total, medScore, actScore, dietScore }
}

// Atomically claim the "motivation send" slot. Returns true exactly once per
// (patient, day) when the patient has all_positive=true and motivation_sent
// has not yet been flipped. Concurrent callers will see false on the loser side.
async function claimMotivationSlot(patientId) {
  const result = await db.query(`
    UPDATE patient_daily_scores
       SET motivation_sent = true
     WHERE patient_id = $1
       AND score_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
       AND all_positive = true
       AND motivation_sent = false
    RETURNING id
  `, [patientId])
  return result.rowCount > 0
}

async function getPatientByPhone(phone) {
  const result = await db.query(
    'SELECT id, name, phone, guardian_name, guardian_phone, medicine_name FROM patients WHERE phone = $1 AND is_active = true',
    [phone]
  )
  return result.rows[0] ?? null
}

async function getRandomEducationMaterial(category) {
  const result = await db.query(`
    SELECT * FROM education_materials
    WHERE category = $1 AND is_active = true
    ORDER BY RANDOM() LIMIT 1
  `, [category])
  return result.rows[0] ?? null
}

export function setupMcpTools(server) {
  // ─── REMINDER FLOW ───────────────────────────────────────────────────────

  server.tool(
    'get_patients_for_reminder',
    'Get all active patients who have not yet received a reminder today (for a given category)',
    {
      category: z.enum(['medication', 'activity', 'diet']).optional().describe('Reminder category filter'),
    },
    async ({ category }) => {
      const result = await db.query(`
        SELECT
          p.id,
          p.name,
          p.phone,
          p.medicine_name,
          p.guardian_name,
          p.guardian_phone
        FROM patients p
        WHERE p.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM reminders r
            WHERE r.patient_id = p.id
              AND r.scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
              AND r.status = 'sent'
              AND ($1::text IS NULL OR r.category = $1)
          )
        ORDER BY p.name
      `, [category ?? null])
      return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] }
    }
  )

  server.tool(
    'record_reminder_sent',
    'Mark that a reminder has been sent to a patient today for a specific category',
    {
      patient_id: z.number().int().describe('Patient ID'),
      category: z.enum(['medication', 'activity', 'diet']).default('medication').describe('Reminder category'),
    },
    async ({ patient_id, category }) => {
      await db.query(`
        INSERT INTO reminders (patient_id, scheduled_date, sent_at, status, category)
        VALUES ($1, (NOW() AT TIME ZONE 'Asia/Jakarta')::date, NOW(), 'sent', $2)
        ON CONFLICT (patient_id, scheduled_date, category)
        DO UPDATE SET sent_at = NOW(), status = 'sent'
      `, [patient_id, category])
      return { content: [{ type: 'text', text: `Reminder recorded for patient ${patient_id} (${category})` }] }
    }
  )

  // ─── RESPONSE FLOW ───────────────────────────────────────────────────────

  server.tool(
    'get_patient_by_phone',
    'Look up a patient by their WhatsApp phone number',
    {
      phone: z.string().describe('WhatsApp phone number, e.g. 628123456789'),
    },
    async ({ phone }) => {
      const result = await db.query(
        'SELECT id, name, phone, guardian_name, guardian_phone, medicine_name FROM patients WHERE phone = $1 AND is_active = true',
        [phone]
      )
      const text = result.rows.length > 0
        ? JSON.stringify(result.rows[0])
        : 'Patient not found'
      return { content: [{ type: 'text', text }] }
    }
  )

  server.tool(
    'record_medication_response',
    'Record a patient\'s response to the medication reminder. Call this when a patient replies.',
    {
      phone:       z.string().describe('Patient WhatsApp phone number'),
      answer:      z.enum(['YES', 'NO', 'UNCLEAR']).describe('YES = took medicine, NO = did not take, UNCLEAR = ambiguous'),
      raw_message: z.string().optional().describe('Original message text from patient'),
    },
    async ({ phone, answer, raw_message }) => {
      const patient = await getPatientByPhone(phone)
      if (!patient) {
        return { content: [{ type: 'text', text: 'Patient not found or inactive' }] }
      }

      const reminderRes = await db.query(
        `SELECT id FROM reminders WHERE patient_id = $1 AND scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date AND category = $2`,
        [patient.id, 'medication']
      )
      const reminderId = reminderRes.rows[0]?.id ?? null

      await db.query(
        'INSERT INTO responses (patient_id, reminder_id, answer, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
        [patient.id, reminderId, answer, raw_message ?? null, 'medication']
      )

      await upsertDailyScore(patient.id)
      return { content: [{ type: 'text', text: `Response ${answer} recorded for ${phone}` }] }
    }
  )

  // ─── SELF-REPORTING FLOW ──────────────────────────────────────────────────

  server.tool(
    'record_activity_report',
    'Record a patient\'s self-reported physical activity count for today',
    {
      phone:          z.string().describe('Patient WhatsApp phone number'),
      activity_count: z.number().int().min(0).max(10).describe('Number of activity sessions today'),
      raw_message:    z.string().optional(),
    },
    async ({ phone, activity_count, raw_message }) => {
      const patient = await getPatientByPhone(phone)
      if (!patient) {
        return { content: [{ type: 'text', text: 'Patient not found or inactive' }] }
      }

      await db.query(`
        INSERT INTO responses (patient_id, response_type, activity_count, raw_message)
        VALUES ($1, 'activity', $2, $3)
      `, [patient.id, activity_count, raw_message ?? null])

      const score = await upsertDailyScore(patient.id)
      let extra = ''
      if (score.allPositive && await claimMotivationSlot(patient.id)) {
        extra = ' [ALL_POSITIVE] Patient completed all health targets today!'
      }

      return { content: [{ type: 'text', text: `Activity report recorded: ${activity_count} times${extra}` }] }
    }
  )

  server.tool(
    'record_diet_report',
    'Record a patient\'s self-reported healthy eating status for today',
    {
      phone:       z.string().describe('Patient WhatsApp phone number'),
      ate_healthy: z.boolean().describe('True if patient ate healthy food today'),
      raw_message: z.string().optional(),
    },
    async ({ phone, ate_healthy, raw_message }) => {
      const patient = await getPatientByPhone(phone)
      if (!patient) {
        return { content: [{ type: 'text', text: 'Patient not found or inactive' }] }
      }

      await db.query(`
        INSERT INTO responses (patient_id, response_type, ate_healthy, raw_message)
        VALUES ($1, 'diet', $2, $3)
      `, [patient.id, ate_healthy, raw_message ?? null])

      const score = await upsertDailyScore(patient.id)
      let extra = ''
      if (score.allPositive && await claimMotivationSlot(patient.id)) {
        extra = ' [ALL_POSITIVE] Patient completed all health targets today!'
      }

      return { content: [{ type: 'text', text: `Diet report recorded: ${ate_healthy ? 'healthy' : 'not healthy'}${extra}` }] }
    }
  )

  server.tool(
    'get_today_reports',
    'Get all self-reports for a patient today (activity, diet, medication)',
    {
      phone: z.string().describe('Patient WhatsApp phone number'),
    },
    async ({ phone }) => {
      const patient = await getPatientByPhone(phone)
      if (!patient) {
        return { content: [{ type: 'text', text: 'Patient not found' }] }
      }
      const result = await db.query(`
        SELECT response_type, answer, activity_count, ate_healthy, medication_count, responded_at
        FROM responses
        WHERE patient_id = $1
          AND (responded_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
        ORDER BY responded_at DESC
      `, [patient.id])
      return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] }
    }
  )

  // ─── GUARDIAN NOTIFICATION FLOW ───────────────────────────────────────────

  server.tool(
    'get_non_responders',
    'Get patients who received a medication reminder today but have not responded yet',
    {},
    async () => {
      const result = await db.query(`
        SELECT
          p.id,
          p.name,
          p.phone,
          p.guardian_name,
          p.guardian_phone,
          p.medicine_name,
          r.sent_at
        FROM patients p
        JOIN reminders r ON r.patient_id = p.id
        WHERE r.scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
          AND r.status = 'sent'
          AND r.category = 'medication'
          AND r.guardian_notified_at IS NULL
          AND p.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM responses rs
            WHERE rs.patient_id = p.id
              AND (rs.responded_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
              AND rs.response_type = 'medication'
          )
        ORDER BY p.name
      `)
      return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] }
    }
  )

  server.tool(
    'record_guardian_notified',
    'Record that a guardian has been notified about their family member not responding',
    {
      patient_id: z.number().int().describe('Patient ID'),
    },
    async ({ patient_id }) => {
      await db.query(`
        UPDATE reminders
        SET guardian_notified_at = NOW()
        WHERE patient_id = $1
          AND scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
          AND category = 'medication'
      `, [patient_id])
      return { content: [{ type: 'text', text: `Guardian notification recorded for patient ${patient_id}` }] }
    }
  )

  // ─── BROADCAST FLOW ──────────────────────────────────────────────────────

  server.tool(
    'get_all_patients_for_broadcast',
    'Get all active patients to send a broadcast message',
    {},
    async () => {
      const result = await db.query(
        'SELECT id, name, phone FROM patients WHERE is_active = true ORDER BY name'
      )
      return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] }
    }
  )

  server.tool(
    'record_broadcast_sent',
    'Record a broadcast message that was sent to patients',
    {
      title:           z.string().optional().describe('Broadcast title'),
      message:         z.string().describe('Broadcast message content'),
      recipient_count: z.number().int().describe('Number of recipients'),
    },
    async ({ title, message, recipient_count }) => {
      await db.query(
        'INSERT INTO broadcasts (title, message, recipient_count) VALUES ($1, $2, $3)',
        [title ?? null, message, recipient_count]
      )
      return { content: [{ type: 'text', text: `Broadcast recorded: ${recipient_count} recipients` }] }
    }
  )
}
