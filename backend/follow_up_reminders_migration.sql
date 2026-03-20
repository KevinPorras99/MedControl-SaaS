CREATE TABLE IF NOT EXISTS follow_up_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    due_date DATE NOT NULL,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_follow_up_reminders_clinic_id ON follow_up_reminders(clinic_id);
CREATE INDEX IF NOT EXISTS ix_follow_up_reminders_patient_id ON follow_up_reminders(patient_id);
CREATE INDEX IF NOT EXISTS ix_follow_up_reminders_due_date ON follow_up_reminders(due_date);

ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;
