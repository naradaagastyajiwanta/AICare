-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20)  NOT NULL UNIQUE,  -- format: 628xxxxxxx (no +)
  guardian_name   VARCHAR(255),
  guardian_phone  VARCHAR(20),
  medicine_name   VARCHAR(255) NOT NULL,
  -- reminder_time column kept for backward compatibility, but new code uses patient_reminders table
  reminder_time   TIME         NOT NULL DEFAULT '08:00:00',
  timezone        VARCHAR(50)  NOT NULL DEFAULT 'Asia/Jakarta',
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Multiple reminders per patient with category support
CREATE TABLE IF NOT EXISTS patient_reminders (
  id            SERIAL PRIMARY KEY,
  patient_id    INTEGER     NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reminder_time TIME        NOT NULL,
  label         VARCHAR(50),  -- e.g. "Pagi", "Siang", "Sore"
  category      VARCHAR(30) NOT NULL DEFAULT 'medication'
                    CHECK (category IN ('medication', 'activity', 'diet')),
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reminder log (one row per patient per day per reminder slot)
CREATE TABLE IF NOT EXISTS reminders (
  id                   SERIAL PRIMARY KEY,
  patient_id           INTEGER     NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reminder_slot_id     INTEGER     REFERENCES patient_reminders(id) ON DELETE SET NULL,
  scheduled_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  sent_at              TIMESTAMPTZ,
  guardian_notified_at TIMESTAMPTZ,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  category             VARCHAR(30) NOT NULL DEFAULT 'medication'
                         CHECK (category IN ('medication', 'activity', 'diet')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Patient responses to reminders (multi-type: medication, activity, diet)
CREATE TABLE IF NOT EXISTS responses (
  id               SERIAL PRIMARY KEY,
  patient_id       INTEGER     NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reminder_id      INTEGER     REFERENCES reminders(id) ON DELETE SET NULL,
  answer           VARCHAR(10) CHECK (answer IN ('YES', 'NO', 'UNCLEAR')),
  raw_message      TEXT,
  response_type    VARCHAR(30) NOT NULL DEFAULT 'medication'
                       CHECK (response_type IN ('medication', 'activity', 'diet', 'general')),
  activity_count   INTEGER,          -- for activity reports: 1, 2, 3+
  ate_healthy      BOOLEAN,          -- for diet reports: true/false
  medication_count INTEGER,          -- for medication: doses taken
  responded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Knowledge base for RAG (embeddings stored as float arrays)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  content    TEXT NOT NULL,
  category   VARCHAR(50) NOT NULL DEFAULT 'umum',
  embedding  FLOAT8[],
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_base(is_active);

-- Broadcast messages
CREATE TABLE IF NOT EXISTS broadcasts (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255),
  message         TEXT        NOT NULL,
  sent_by         VARCHAR(255) DEFAULT 'Petugas',
  recipient_count INTEGER      DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Education materials (infographics, tips, motivation)
CREATE TABLE IF NOT EXISTS education_materials (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(30) NOT NULL CHECK (category IN ('dos_donts', 'motivation', 'nutrition', 'activity')),
  content     TEXT NOT NULL,
  image_url   VARCHAR(500),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily health scores per patient (for motivation tracking)
CREATE TABLE IF NOT EXISTS patient_daily_scores (
  id               SERIAL PRIMARY KEY,
  patient_id       INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  score_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  medication_score INTEGER DEFAULT 0,
  activity_score   INTEGER DEFAULT 0,
  diet_score       INTEGER DEFAULT 0,
  total_score      INTEGER DEFAULT 0,
  all_positive     BOOLEAN DEFAULT false,
  motivation_sent  BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, score_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_date        ON reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_date ON reminders(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminders_category     ON reminders(category);
CREATE INDEX IF NOT EXISTS idx_responses_patient      ON responses(patient_id);
CREATE INDEX IF NOT EXISTS idx_responses_date         ON responses(responded_at);
CREATE INDEX IF NOT EXISTS idx_responses_type         ON responses(response_type);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_time ON patient_reminders(patient_id, reminder_time);
CREATE INDEX IF NOT EXISTS idx_patient_reminders_category ON patient_reminders(category);
CREATE INDEX IF NOT EXISTS idx_edu_category           ON education_materials(category, is_active);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_reminders_unique
  ON patient_reminders (patient_id, category, reminder_time);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_unique
  ON reminders (patient_id, scheduled_date, reminder_slot_id);

-- Auto-update updated_at on patients
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS patients_updated_at ON patients;
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Migration: add timezone column for existing databases
ALTER TABLE patients ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Jakarta';
