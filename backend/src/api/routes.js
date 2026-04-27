import { Router } from 'express'
import { db } from '../db/index.js'

const router = Router()

// ─── PATIENTS ─────────────────────────────────────────────────────────────────

router.get('/patients', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.*,
        COUNT(DISTINCT r.id)                                            AS total_reminders,
        COUNT(DISTINCT rs.id)                                           AS total_responses,
        COUNT(DISTINCT CASE WHEN rs.answer = 'YES' THEN rs.id END)     AS total_yes,
        ROUND(
          COUNT(DISTINCT CASE WHEN rs.answer = 'YES' THEN rs.id END)::numeric
          / NULLIF(COUNT(DISTINCT r.id), 0) * 100, 1
        )                                                               AS compliance_rate
      FROM patients p
      LEFT JOIN reminders  r  ON r.patient_id  = p.id AND r.status = 'sent'
      LEFT JOIN responses  rs ON rs.patient_id = p.id
      GROUP BY p.id
      ORDER BY p.name
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.id])
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Not found' })

    const history = await db.query(`
      SELECT r.scheduled_date, r.sent_at, rs.answer, rs.responded_at, rs.raw_message
      FROM reminders r
      LEFT JOIN responses rs ON rs.patient_id = r.patient_id
        AND DATE(rs.responded_at) = r.scheduled_date
      WHERE r.patient_id = $1
      ORDER BY r.scheduled_date DESC
      LIMIT 60
    `, [req.params.id])

    res.json({ ...patient.rows[0], history: history.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/patients', async (req, res) => {
  const { name, phone, guardian_name, guardian_phone, medicine_name, reminder_time, notes } = req.body
  if (!name || !phone || !medicine_name) {
    return res.status(400).json({ error: 'name, phone, and medicine_name are required' })
  }
  try {
    const result = await db.query(`
      INSERT INTO patients (name, phone, guardian_name, guardian_phone, medicine_name, reminder_time, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, phone, guardian_name ?? null, guardian_phone ?? null, medicine_name, reminder_time ?? '08:00', notes ?? null])
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Phone number already registered' })
    res.status(500).json({ error: err.message })
  }
})

router.put('/patients/:id', async (req, res) => {
  const { name, phone, guardian_name, guardian_phone, medicine_name, reminder_time, notes, is_active } = req.body
  try {
    const result = await db.query(`
      UPDATE patients
      SET name=$1, phone=$2, guardian_name=$3, guardian_phone=$4,
          medicine_name=$5, reminder_time=$6, notes=$7, is_active=$8
      WHERE id=$9
      RETURNING *
    `, [name, phone, guardian_name ?? null, guardian_phone ?? null,
        medicine_name, reminder_time ?? '08:00', notes ?? null, is_active ?? true, req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/patients/:id', async (req, res) => {
  try {
    await db.query('UPDATE patients SET is_active = false WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── COMPLIANCE ───────────────────────────────────────────────────────────────

router.get('/compliance', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 30, 90)
  try {
    const result = await db.query(`
      SELECT
        p.id          AS patient_id,
        p.name        AS patient_name,
        p.medicine_name,
        r.scheduled_date,
        r.sent_at,
        rs.answer,
        rs.responded_at
      FROM patients p
      JOIN reminders r ON r.patient_id = p.id
        AND r.scheduled_date >= CURRENT_DATE - ($1 || ' days')::interval
        AND r.status = 'sent'
      LEFT JOIN responses rs ON rs.patient_id = p.id
        AND DATE(rs.responded_at) = r.scheduled_date
      WHERE p.is_active = true
      ORDER BY r.scheduled_date DESC, p.name
    `, [days])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── STATS ────────────────────────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [patients, todayStats, weeklyTrend] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)                          AS total,
          COUNT(*) FILTER (WHERE is_active) AS active
        FROM patients
      `),
      db.query(`
        SELECT
          COUNT(DISTINCT r.patient_id)                                                   AS sent,
          COUNT(DISTINCT rs.patient_id)                                                  AS responded,
          COUNT(DISTINCT CASE WHEN rs.answer = 'YES' THEN rs.patient_id END)             AS took_medicine,
          COUNT(DISTINCT CASE WHEN rs.answer = 'NO'  THEN rs.patient_id END)             AS declined
        FROM reminders r
        LEFT JOIN responses rs
          ON rs.patient_id = r.patient_id
          AND DATE(rs.responded_at) = CURRENT_DATE
        WHERE r.scheduled_date = CURRENT_DATE AND r.status = 'sent'
      `),
      db.query(`
        SELECT
          DATE(rs.responded_at)                                   AS date,
          COUNT(*) FILTER (WHERE rs.answer = 'YES')               AS yes_count,
          COUNT(*) FILTER (WHERE rs.answer = 'NO')                AS no_count,
          COUNT(*) FILTER (WHERE rs.answer = 'UNCLEAR')           AS unclear_count
        FROM responses rs
        WHERE rs.responded_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(rs.responded_at)
        ORDER BY date
      `),
    ])

    res.json({
      patients:      patients.rows[0],
      today:         todayStats.rows[0],
      weekly_trend:  weeklyTrend.rows,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── BROADCASTS ───────────────────────────────────────────────────────────────

router.get('/broadcasts', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 50')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/broadcasts', async (req, res) => {
  const { title, message } = req.body
  if (!message) return res.status(400).json({ error: 'message is required' })
  try {
    const patients = await db.query('SELECT id, name, phone FROM patients WHERE is_active = true ORDER BY name')
    const recipientCount = patients.rows.length

    const broadcast = await db.query(
      'INSERT INTO broadcasts (title, message, recipient_count) VALUES ($1, $2, $3) RETURNING *',
      [title ?? null, message, recipientCount]
    )

    res.status(201).json({
      broadcast: broadcast.rows[0],
      patients:  patients.rows,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
