import { z } from 'zod'
import { db } from '../db/index.js'

export function setupMcpTools(server) {
  // ─── REMINDER FLOW ───────────────────────────────────────────────────────

  server.tool(
    'get_patients_for_reminder',
    'Get all active patients who have not yet received a reminder today',
    {},
    async () => {
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
              AND r.scheduled_date = CURRENT_DATE
              AND r.status = 'sent'
          )
        ORDER BY p.name
      `)
      return { content: [{ type: 'text', text: JSON.stringify(result.rows) }] }
    }
  )

  server.tool(
    'record_reminder_sent',
    'Mark that a medication reminder has been sent to a patient today',
    {
      patient_id: z.number().int().describe('Patient ID'),
    },
    async ({ patient_id }) => {
      await db.query(`
        INSERT INTO reminders (patient_id, scheduled_date, sent_at, status)
        VALUES ($1, CURRENT_DATE, NOW(), 'sent')
        ON CONFLICT (patient_id, scheduled_date)
        DO UPDATE SET sent_at = NOW(), status = 'sent'
      `, [patient_id])
      return { content: [{ type: 'text', text: `Reminder recorded for patient ${patient_id}` }] }
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
        'SELECT id, name, phone, guardian_name, guardian_phone, medicine_name FROM patients WHERE phone = $1',
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
      const patientRes = await db.query(
        'SELECT id FROM patients WHERE phone = $1 AND is_active = true',
        [phone]
      )
      if (patientRes.rows.length === 0) {
        return { content: [{ type: 'text', text: 'Patient not found or inactive' }] }
      }

      const patientId = patientRes.rows[0].id

      const reminderRes = await db.query(
        'SELECT id FROM reminders WHERE patient_id = $1 AND scheduled_date = CURRENT_DATE',
        [patientId]
      )
      const reminderId = reminderRes.rows[0]?.id ?? null

      await db.query(
        'INSERT INTO responses (patient_id, reminder_id, answer, raw_message) VALUES ($1, $2, $3, $4)',
        [patientId, reminderId, answer, raw_message ?? null]
      )

      return { content: [{ type: 'text', text: `Response ${answer} recorded for ${phone}` }] }
    }
  )

  // ─── GUARDIAN NOTIFICATION FLOW ───────────────────────────────────────────

  server.tool(
    'get_non_responders',
    'Get patients who received a reminder today but have not responded yet',
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
        WHERE r.scheduled_date = CURRENT_DATE
          AND r.status = 'sent'
          AND r.guardian_notified_at IS NULL
          AND p.is_active = true
          AND NOT EXISTS (
            SELECT 1 FROM responses rs
            WHERE rs.patient_id = p.id
              AND DATE(rs.responded_at) = CURRENT_DATE
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
        WHERE patient_id = $1 AND scheduled_date = CURRENT_DATE
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
