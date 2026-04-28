-- Migration 001: Multi-Category Reminders, Self-Reporting & Education
-- Run this against the existing database

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. EXTEND patient_reminders WITH category
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE patient_reminders
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'medication'
    CHECK (category IN ('medication', 'activity', 'diet'));

-- Drop old unique constraint (if exists) to allow same time different category
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_reminders_patient_id_reminder_time_key'
  ) THEN
    ALTER TABLE patient_reminders DROP CONSTRAINT patient_reminders_patient_id_reminder_time_key;
  END IF;
END $$;

-- New unique index: one slot per category per patient per time
DROP INDEX IF EXISTS idx_patient_reminders_unique;
CREATE UNIQUE INDEX idx_patient_reminders_unique
  ON patient_reminders (patient_id, category, reminder_time);

CREATE INDEX IF NOT EXISTS idx_patient_reminders_category ON patient_reminders(category);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. EXTEND reminders LOG TABLE WITH category
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'medication'
    CHECK (category IN ('medication', 'activity', 'diet'));

-- Drop old unique constraint (if exists) — we now need one row per category per day
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminders_patient_id_scheduled_date_key'
  ) THEN
    ALTER TABLE reminders DROP CONSTRAINT reminders_patient_id_scheduled_date_key;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_reminders_unique;
CREATE UNIQUE INDEX idx_reminders_unique ON reminders (patient_id, scheduled_date, category);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. EXTEND responses WITH response_type AND typed data columns
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE responses
  ADD COLUMN IF NOT EXISTS response_type VARCHAR(30) NOT NULL DEFAULT 'medication'
    CHECK (response_type IN ('medication', 'activity', 'diet', 'general')),
  ADD COLUMN IF NOT EXISTS activity_count INTEGER,
  ADD COLUMN IF NOT EXISTS ate_healthy BOOLEAN,
  ADD COLUMN IF NOT EXISTS medication_count INTEGER;

CREATE INDEX IF NOT EXISTS idx_responses_type ON responses(response_type);

-- Make answer nullable (activity/diet may not use YES/NO)
ALTER TABLE responses ALTER COLUMN answer DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. NEW education_materials TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS education_materials (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(30) NOT NULL CHECK (category IN ('dos_donts', 'motivation', 'nutrition', 'activity')),
  content     TEXT NOT NULL,
  image_url   VARCHAR(500),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edu_category ON education_materials(category, is_active);

-- Seed default text-only education materials
INSERT INTO education_materials (title, category, content)
VALUES
  ('Do: Minum Obat Tepat Waktu', 'dos_donts', '✅ DO: Minum obat sesuai jadwal dokter. Gunakan alarm pengingat.\n❌ DON''T: Lewati dosis atau berhenti minum obat tanpa izin dokter.'),
  ('Do: Aktivitas Fisik Rutin', 'dos_donts', '✅ DO: Lakukan aktivitas fisik 30 menit setiap hari (jalan kaki, senam, bersepeda).\n❌ DON''T: Duduk terlalu lama tanpa bergerak.'),
  ('Do: Pola Makan Sehat', 'dos_donts', '✅ DO: Makan sayur, buah, protein, dan karbohidrat kompleks. Minum air putih cukup.\n❌ DON''T: Konsumsi gula berlebihan, gorengan, dan makanan olahan.'),
  ('Motivasi: Kesehatan Adalah Investasi', 'motivation', '🌟 Setiap langkah kecil menuju kesehatan adalah investasi untuk masa depan yang lebih baik. Pertahankan semangat! 💪'),
  ('Nutrisi: Pentingnya Protein', 'nutrition', '🥚 Protein membantu memperbaiki jaringan tubuh dan menjaga daya tahan. Sumber baik: ikan, telur, tempe, dan kacang-kacangan.')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. NEW patient_daily_scores TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

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
