-- Track each reminder slot individually so patients with multiple slots
-- per category per day (e.g. 3 medication reminders) are each sent exactly once.

ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reminder_slot_id INTEGER REFERENCES patient_reminders(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS idx_reminders_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reminders_unique ON reminders (patient_id, scheduled_date, reminder_slot_id);
