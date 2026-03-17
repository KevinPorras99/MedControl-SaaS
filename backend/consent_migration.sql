-- Plantillas de consentimiento
CREATE TABLE IF NOT EXISTS consent_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_consent_templates_clinic ON consent_templates(clinic_id);

-- Consentimientos firmados por pacientes
CREATE TABLE IF NOT EXISTS patient_consents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    template_id       UUID NOT NULL REFERENCES consent_templates(id) ON DELETE RESTRICT,
    medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
    signed_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pdf_path          TEXT NOT NULL,
    signed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient  ON patient_consents(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_template ON patient_consents(template_id);
