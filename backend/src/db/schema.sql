-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  phone           VARCHAR(20)  NOT NULL UNIQUE,  -- format: 628xxxxxxx (no +)
  guardian_name   VARCHAR(255),
  guardian_phone  VARCHAR(20),
  medicine_name   VARCHAR(255) NOT NULL,
  reminder_time   TIME         NOT NULL DEFAULT '08:00:00',
  is_active       BOOLEAN      NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Reminder log (one row per patient per day)
CREATE TABLE IF NOT EXISTS reminders (
  id                   SERIAL PRIMARY KEY,
  patient_id           INTEGER     NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  sent_at              TIMESTAMPTZ,
  guardian_notified_at TIMESTAMPTZ,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'sent', 'failed')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, scheduled_date)
);

-- Patient responses to reminders
CREATE TABLE IF NOT EXISTS responses (
  id           SERIAL PRIMARY KEY,
  patient_id   INTEGER     NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  reminder_id  INTEGER     REFERENCES reminders(id) ON DELETE SET NULL,
  answer       VARCHAR(10) NOT NULL CHECK (answer IN ('YES', 'NO', 'UNCLEAR')),
  raw_message  TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Broadcast messages
CREATE TABLE IF NOT EXISTS broadcasts (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(255),
  message         TEXT        NOT NULL,
  sent_by         VARCHAR(255) DEFAULT 'Petugas',
  recipient_count INTEGER      DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reminders_date        ON reminders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_reminders_patient_date ON reminders(patient_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_responses_patient      ON responses(patient_id);
CREATE INDEX IF NOT EXISTS idx_responses_date         ON responses(responded_at);

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
