import { Router } from 'express'
import { db } from '../db/index.js'
import { waService } from '../whatsapp/service.js'
import { generateEmbedding, parseDocxToChunks } from '../rag.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.resolve(__dirname, '../../../uploads')

// Normalize phone to E.164-style digits (no +). Leading 0 → 62 (Indonesia).
// International callers should enter number with country code, no leading 0.
function normalizePhone(phone) {
  if (!phone) return phone
  let n = String(phone).replace(/\D/g, '')
  if (n.startsWith('0')) n = '62' + n.slice(1)
  return n
}

function phoneToJid(phone) {
  return `${normalizePhone(phone)}@s.whatsapp.net`
}
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `edu-${Date.now()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

const router = Router()

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/patients', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        p.*,
        COUNT(DISTINCT r.id)                                                                                 AS total_reminders,
        COUNT(DISTINCT CASE WHEN rs.response_type = 'medication' THEN rs.id END)                             AS total_responses,
        COUNT(DISTINCT CASE WHEN rs.answer = 'YES' AND rs.response_type = 'medication' THEN rs.id END)       AS total_yes,
        ROUND(
          COUNT(DISTINCT CASE WHEN rs.answer = 'YES' AND rs.response_type = 'medication' THEN rs.id END)::numeric
          / NULLIF(COUNT(DISTINCT CASE WHEN rs.response_type = 'medication' THEN rs.id END), 0) * 100, 1
        )                                                                                                     AS compliance_rate
      FROM patients p
      LEFT JOIN reminders  r  ON r.patient_id  = p.id AND r.status = 'sent'
      LEFT JOIN responses  rs ON rs.patient_id = p.id
      GROUP BY p.id
      ORDER BY p.name
    `)

    // Fetch multiple reminder times for each patient
    const patientIds = result.rows.map(r => r.id)
    let remindersMap = {}
    if (patientIds.length > 0) {
      const reminders = await db.query(`
        SELECT patient_id, reminder_time, label, category
        FROM patient_reminders
        WHERE patient_id = ANY($1) AND is_active = true
        ORDER BY reminder_time
      `, [patientIds])
      for (const row of reminders.rows) {
        if (!remindersMap[row.patient_id]) remindersMap[row.patient_id] = []
        remindersMap[row.patient_id].push({ time: row.reminder_time, label: row.label, category: row.category })
      }
    }

    const rows = result.rows.map(p => ({
      ...p,
      reminder_times: remindersMap[p.id] || [{ time: p.reminder_time, label: null }]
    }))
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await db.query('SELECT * FROM patients WHERE id = $1', [req.params.id])
    if (patient.rows.length === 0) return res.status(404).json({ error: 'Not found' })

    const reminderTimes = await db.query(`
      SELECT reminder_time, label, is_active, category
      FROM patient_reminders
      WHERE patient_id = $1
      ORDER BY reminder_time
    `, [req.params.id])

    const history = await db.query(`
      SELECT r.scheduled_date, r.sent_at, r.category as reminder_category,
             rs.answer, rs.responded_at, rs.raw_message, rs.response_type
      FROM reminders r
      LEFT JOIN responses rs ON rs.patient_id = r.patient_id
        AND DATE(rs.responded_at) = r.scheduled_date
        AND rs.response_type = r.category
      WHERE r.patient_id = $1
      ORDER BY r.scheduled_date DESC, r.category
      LIMIT 60
    `, [req.params.id])

    res.json({
      ...patient.rows[0],
      reminder_times: reminderTimes.rows,
      history: history.rows
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/patients', async (req, res) => {
  const { name, phone, guardian_name, guardian_phone, medicine_name, reminder_times, notes, timezone } = req.body
  if (!name || !phone || !medicine_name) {
    return res.status(400).json({ error: 'name, phone, and medicine_name are required' })
  }

  const normPhone = normalizePhone(phone)
  const normGuardian = normalizePhone(guardian_phone) ?? null
  // Default reminder time for backward compatibility
  const defaultTime = reminder_times?.[0]?.time ?? '08:00'
  const tz = timezone || 'Asia/Jakarta'

  try {
    await db.query('BEGIN')

    const patient = await db.query(`
      INSERT INTO patients (name, phone, guardian_name, guardian_phone, medicine_name, reminder_time, timezone, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [name, normPhone, guardian_name ?? null, normGuardian, medicine_name, defaultTime, tz, notes ?? null])

    const patientId = patient.rows[0].id

    // Insert multiple reminder times
    const times = reminder_times?.length > 0 ? reminder_times : [{ time: defaultTime, label: null }]
    for (const rt of times) {
      await db.query(`
        INSERT INTO patient_reminders (patient_id, reminder_time, label, category)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (patient_id, category, reminder_time) DO NOTHING
      `, [patientId, rt.time ?? defaultTime, rt.label ?? null, rt.category ?? 'medication'])
    }

    await db.query('COMMIT')
    res.status(201).json(patient.rows[0])
  } catch (err) {
    await db.query('ROLLBACK')
    if (err.code === '23505') return res.status(409).json({ error: 'Phone number already registered' })
    res.status(500).json({ error: err.message })
  }
})

router.put('/patients/:id', async (req, res) => {
  const { name, phone, guardian_name, guardian_phone, medicine_name, reminder_times, notes, is_active, timezone } = req.body
  const tz = timezone || 'Asia/Jakarta'
  const normPhone = normalizePhone(phone)
  const normGuardian = normalizePhone(guardian_phone) ?? null
  try {
    await db.query('BEGIN')

    const patient = await db.query(`
      UPDATE patients
      SET name=$1, phone=$2, guardian_name=$3, guardian_phone=$4,
          medicine_name=$5, reminder_time=$6, timezone=$7, notes=$8, is_active=$9
      WHERE id=$10
      RETURNING *
    `, [name, normPhone, guardian_name ?? null, normGuardian,
        medicine_name, reminder_times?.[0]?.time ?? '08:00', tz, notes ?? null, is_active ?? true, req.params.id])

    if (patient.rows.length === 0) {
      await db.query('ROLLBACK')
      return res.status(404).json({ error: 'Not found' })
    }

    // If reminder_times provided, replace all reminders
    if (reminder_times && Array.isArray(reminder_times)) {
      // Delete old reminders
      await db.query('DELETE FROM patient_reminders WHERE patient_id = $1', [req.params.id])
      // Insert new ones
      for (const rt of reminder_times) {
        await db.query(`
          INSERT INTO patient_reminders (patient_id, reminder_time, label, category)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (patient_id, category, reminder_time) DO NOTHING
        `, [req.params.id, rt.time, rt.label ?? null, rt.category ?? 'medication'])
      }
      // Delete today's reminder records so cron will re-send at new times
      await db.query(`
        DELETE FROM reminders WHERE patient_id = $1 AND scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
      `, [req.params.id])
    }

    await db.query('COMMIT')
    res.json(patient.rows[0])
  } catch (err) {
    await db.query('ROLLBACK')
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

router.patch('/patients/:id/status', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE patients SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// PATIENT REMINDERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/patients/:id/reminders', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, reminder_time, label, is_active, category
      FROM patient_reminders
      WHERE patient_id = $1
      ORDER BY reminder_time
    `, [req.params.id])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/patients/:id/reminders', async (req, res) => {
  const { reminder_time, label, category } = req.body
  if (!reminder_time) return res.status(400).json({ error: 'reminder_time is required' })
  try {
    const result = await db.query(`
      INSERT INTO patient_reminders (patient_id, reminder_time, label, category)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [req.params.id, reminder_time, label ?? null, category ?? 'medication'])
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Reminder time already exists for this patient and category' })
    res.status(500).json({ error: err.message })
  }
})

router.delete('/patients/:patientId/reminders/:reminderId', async (req, res) => {
  try {
    await db.query('DELETE FROM patient_reminders WHERE id = $1 AND patient_id = $2', [req.params.reminderId, req.params.patientId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// REMINDERS (flat list, filterable)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/reminders', async (req, res) => {
  try {
    const filters = []
    const values = []
    if (req.query.patient_id) {
      values.push(parseInt(req.query.patient_id, 10))
      filters.push(`r.patient_id = $${values.length}`)
    }
    if (req.query.date) {
      values.push(req.query.date)
      filters.push(`r.scheduled_date = $${values.length}`)
    } else {
      const days = Math.min(parseInt(req.query.days) || 7, 90)
      values.push(days)
      filters.push(`r.scheduled_date >= CURRENT_DATE - ($${values.length}::integer * INTERVAL '1 day')`)
    }
    if (req.query.status) {
      values.push(req.query.status)
      filters.push(`r.status = $${values.length}`)
    }
    if (req.query.category) {
      values.push(req.query.category)
      filters.push(`r.category = $${values.length}`)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000)

    const result = await db.query(`
      SELECT
        r.id,
        r.patient_id,
        p.name AS patient_name,
        r.scheduled_date,
        r.sent_at,
        r.guardian_notified_at,
        r.status,
        r.category,
        r.created_at
      FROM reminders r
      JOIN patients p ON p.id = r.patient_id
      ${where}
      ORDER BY r.scheduled_date DESC, r.category, p.name
      LIMIT ${limit}
    `, values)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSES (flat list, filterable)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/responses', async (req, res) => {
  try {
    const filters = []
    const values = []
    if (req.query.patient_id) {
      values.push(parseInt(req.query.patient_id, 10))
      filters.push(`rs.patient_id = $${values.length}`)
    }
    if (req.query.date) {
      values.push(req.query.date)
      filters.push(`DATE(rs.responded_at) = $${values.length}`)
    } else {
      const days = Math.min(parseInt(req.query.days) || 7, 90)
      values.push(days)
      filters.push(`rs.responded_at >= CURRENT_DATE - ($${values.length}::integer * INTERVAL '1 day')`)
    }
    if (req.query.response_type) {
      values.push(req.query.response_type)
      filters.push(`rs.response_type = $${values.length}`)
    }
    if (req.query.answer) {
      values.push(req.query.answer)
      filters.push(`rs.answer = $${values.length}`)
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const limit = Math.min(parseInt(req.query.limit) || 200, 1000)

    const result = await db.query(`
      SELECT
        rs.id,
        rs.patient_id,
        p.name AS patient_name,
        rs.reminder_id,
        rs.answer,
        rs.raw_message,
        rs.response_type,
        rs.activity_count,
        rs.ate_healthy,
        rs.medication_count,
        rs.responded_at
      FROM responses rs
      JOIN patients p ON p.id = rs.patient_id
      ${where}
      ORDER BY rs.responded_at DESC
      LIMIT ${limit}
    `, values)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE
// ═══════════════════════════════════════════════════════════════════════════════

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
        r.category    AS reminder_category,
        rs.answer,
        rs.response_type,
        rs.responded_at
      FROM patients p
      JOIN reminders r ON r.patient_id = p.id
        AND r.scheduled_date >= CURRENT_DATE - ($1::integer * INTERVAL '1 day')
        AND r.status = 'sent'
        AND r.category = 'medication'
      LEFT JOIN responses rs ON rs.patient_id = p.id
        AND DATE(rs.responded_at) = r.scheduled_date
        AND rs.response_type = 'medication'
      WHERE p.is_active = true
      ORDER BY r.scheduled_date DESC, p.name
    `, [days])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const [patients, todayStats, weeklyTrend, todayScores, todayReports, categoryBreakdown] = await Promise.all([
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
          AND rs.response_type = 'medication'
        WHERE r.scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date AND r.status = 'sent' AND r.category = 'medication'
      `),
      db.query(`
        SELECT
          DATE(rs.responded_at)                                   AS date,
          COUNT(*) FILTER (WHERE rs.answer = 'YES')               AS yes_count,
          COUNT(*) FILTER (WHERE rs.answer = 'NO')                AS no_count,
          COUNT(*) FILTER (WHERE rs.answer = 'UNCLEAR')           AS unclear_count
        FROM responses rs
        WHERE rs.responded_at >= CURRENT_DATE - INTERVAL '7 days'
          AND rs.response_type = 'medication'
        GROUP BY DATE(rs.responded_at)
        ORDER BY date
      `),
      db.query(`
        SELECT
          COALESCE(AVG(total_score), 0)::int                      AS avg_score
        FROM patient_daily_scores
        WHERE score_date = CURRENT_DATE
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE response_type = 'activity')   AS activity_reports,
          COUNT(*) FILTER (WHERE response_type = 'diet')       AS diet_reports
        FROM responses
        WHERE (responded_at AT TIME ZONE 'Asia/Jakarta')::date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
      `),
      db.query(`
        SELECT
          category,
          COUNT(*) AS sent_count
        FROM reminders
        WHERE scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date AND status = 'sent'
        GROUP BY category
      `),
    ])

    // Build category map
    const cats = {}
    for (const row of categoryBreakdown.rows) cats[row.category] = Number(row.sent_count)

    res.json({
      patients:         patients.rows[0],
      today:            todayStats.rows[0],
      weekly_trend:     weeklyTrend.rows,
      today_scores:     todayScores.rows[0],
      today_reports:    todayReports.rows[0],
      category_today:   cats,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-REPORTS / DAILY SCORES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/self-reports', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30)
  try {
    const result = await db.query(`
      SELECT
        pds.*,
        p.name AS patient_name
      FROM patient_daily_scores pds
      JOIN patients p ON p.id = pds.patient_id
      WHERE pds.score_date >= CURRENT_DATE - ($1::integer * INTERVAL '1 day')
      ORDER BY pds.score_date DESC, p.name
    `, [days])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/self-reports/:patientId', async (req, res) => {
  const days = Math.min(parseInt(req.query.days) || 7, 30)
  try {
    const [scores, rawReports] = await Promise.all([
      db.query(`
        SELECT * FROM patient_daily_scores
        WHERE patient_id = $1 AND score_date >= CURRENT_DATE - ($2::integer * INTERVAL '1 day')
        ORDER BY score_date DESC
      `, [req.params.patientId, days]),
      db.query(`
        SELECT response_type, answer, activity_count, ate_healthy, medication_count, raw_message, responded_at
        FROM responses
        WHERE patient_id = $1 AND responded_at >= CURRENT_DATE - ($2::integer * INTERVAL '1 day')
        ORDER BY responded_at DESC
      `, [req.params.patientId, days]),
    ])
    res.json({ scores: scores.rows, reports: rawReports.rows })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// EDUCATION MATERIALS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/education', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM education_materials
      ORDER BY category, created_at DESC
    `)
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/education', upload.single('image'), async (req, res) => {
  const { title, category, content, image_url } = req.body
  if (!title || !category || !content) {
    return res.status(400).json({ error: 'title, category, and content are required' })
  }
  try {
    const imageUrl = req.file
      ? `/uploads/${req.file.filename}`
      : (image_url ?? null)
    const result = await db.query(`
      INSERT INTO education_materials (title, category, content, image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, category, content, imageUrl])
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/education/:id/image', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' })
  try {
    const imageUrl = `/uploads/${req.file.filename}`
    const result = await db.query(
      'UPDATE education_materials SET image_url = $1 WHERE id = $2 RETURNING *',
      [imageUrl, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/education/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM education_materials WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/education/:id/status', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE education_materials SET is_active = NOT is_active WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// BROADCASTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/broadcasts', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM broadcasts ORDER BY created_at DESC LIMIT 50')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/broadcasts', async (req, res) => {
  const { title, message, image_url } = req.body
  if (!message) return res.status(400).json({ error: 'message is required' })
  try {
    const patients = await db.query('SELECT id, name, phone FROM patients WHERE is_active = true ORDER BY name')
    const recipientCount = patients.rows.length

    const broadcast = await db.query(
      'INSERT INTO broadcasts (title, message, recipient_count) VALUES ($1, $2, $3) RETURNING *',
      [title ?? null, message, recipientCount]
    )

    // Resolve image buffer if image_url is a local upload path
    let imageBuffer = null
    if (image_url && image_url.startsWith('/uploads/')) {
      const filePath = path.join(UPLOADS_DIR, path.basename(image_url))
      if (fs.existsSync(filePath)) imageBuffer = fs.readFileSync(filePath)
    }

    let sent = 0, failed = 0
    for (const patient of patients.rows) {
      try {
        const jid = phoneToJid(patient.phone)
        if (imageBuffer) {
          await waService.sendMessage(jid, { image: imageBuffer, caption: message })
        } else {
          await waService.sendMessage(jid, message)
        }
        sent++
      } catch {
        failed++
      }
    }

    res.status(201).json({
      broadcast: broadcast.rows[0],
      sent,
      failed,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE (RAG)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/knowledge', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, title, content, category, is_active, created_at FROM knowledge_base ORDER BY category, created_at DESC'
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/knowledge', async (req, res) => {
  const { title, content, category = 'umum' } = req.body
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'title and content are required' })
  }
  try {
    // Generate embedding before inserting
    const embedding = await generateEmbedding(`${title}\n${content}`)
    const result = await db.query(
      'INSERT INTO knowledge_base (title, content, category, embedding) VALUES ($1, $2, $3, $4) RETURNING id, title, content, category, is_active, created_at',
      [title.trim(), content.trim(), category, embedding]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/knowledge/:id', async (req, res) => {
  const { title, content, category } = req.body
  if (!title?.trim() || !content?.trim()) {
    return res.status(400).json({ error: 'title and content are required' })
  }
  try {
    // Regenerate embedding when content changes
    const embedding = await generateEmbedding(`${title}\n${content}`)
    const result = await db.query(
      'UPDATE knowledge_base SET title=$1, content=$2, category=$3, embedding=$4 WHERE id=$5 RETURNING id, title, content, category, is_active, created_at',
      [title.trim(), content.trim(), category ?? 'umum', embedding, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/knowledge/:id/status', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE knowledge_base SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/knowledge/bulk', async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids array is required' })
  }
  try {
    const result = await db.query('DELETE FROM knowledge_base WHERE id = ANY($1) RETURNING id', [ids])
    res.json({ deleted: result.rowCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/knowledge/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM knowledge_base WHERE id = $1', [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Parse DOCX → return chunks preview (no DB write yet)
const docxUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

router.post('/knowledge/parse-docx', docxUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const ext = path.extname(req.file.originalname).toLowerCase()
  if (ext !== '.docx') return res.status(400).json({ error: 'Only .docx files are supported' })
  try {
    const docName = path.basename(req.file.originalname, '.docx')
    const chunks = await parseDocxToChunks(req.file.buffer, docName)
    res.json({ docName, chunks })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Bulk-save chunks (generates embeddings in parallel, batched to avoid rate limits)
router.post('/knowledge/bulk', async (req, res) => {
  const { chunks, category = 'umum' } = req.body
  if (!Array.isArray(chunks) || chunks.length === 0) {
    return res.status(400).json({ error: 'chunks array is required' })
  }

  const BATCH = 20  // 20 parallel embeddings per batch — well within OpenAI rate limits (3000 RPM)
  const results = []
  const errors  = []

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH)
    await Promise.all(batch.map(async ({ title, content }) => {
      try {
        const embedding = await generateEmbedding(`${title}\n${content}`)
        const r = await db.query(
          'INSERT INTO knowledge_base (title, content, category, embedding) VALUES ($1, $2, $3, $4) RETURNING id, title',
          [title.trim(), content.trim(), category, embedding]
        )
        results.push(r.rows[0])
      } catch (err) {
        errors.push({ title, error: err.message })
      }
    }))
  }

  res.status(201).json({ saved: results.length, failed: errors.length, errors })
})

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/wa/status', (_req, res) => {
  res.json(waService.state)
})

router.get('/wa/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()
  waService.addSseClient(res)
})

router.post('/wa/restart', async (_req, res) => {
  await waService.reconnect()
  res.json({ ok: true })
})

// Clear session files and reconnect — always shows a fresh QR
router.post('/wa/logout', async (_req, res) => {
  await waService.logout()
  res.json({ ok: true })
})

export default router
