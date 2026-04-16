-- ============================================================
-- MedControl SaaS — Migración inicial COMPLETA
-- Ejecutar en Supabase SQL Editor (una sola vez, BD vacía)
-- ============================================================

-- ─── 1. ENUMS ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE subscription_plan    AS ENUM ('basico', 'profesional', 'clinica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role            AS ENUM ('admin_clinic', 'doctor', 'receptionist', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status   AS ENUM ('programada', 'confirmada', 'cancelada', 'atendida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status       AS ENUM ('pendiente', 'pagada', 'anulada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method       AS ENUM ('efectivo', 'tarjeta', 'transferencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE whatsapp_log_status  AS ENUM ('enviado', 'fallido', 'pendiente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. CLINICS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinics (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  VARCHAR(255) NOT NULL,
    access_code           VARCHAR(10)  UNIQUE,
    subscription_plan     subscription_plan NOT NULL DEFAULT 'basico',
    subscription_status   VARCHAR(50)  NOT NULL DEFAULT 'inactive',
    stripe_customer_id    VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Contacto
    email                 VARCHAR(255),
    phone                 VARCHAR(50),
    second_phone          VARCHAR(50),
    whatsapp              VARCHAR(50),
    website               VARCHAR(255),
    -- Perfil legal / especialidad
    legal_id              VARCHAR(50),
    specialty             VARCHAR(100),
    -- Dirección
    address               VARCHAR(500),
    city                  VARCHAR(100),
    province              VARCHAR(100),
    country               VARCHAR(100) DEFAULT 'Costa Rica',
    postal_code           VARCHAR(20),
    -- Redes y branding
    instagram             VARCHAR(255),
    facebook              VARCHAR(255),
    logo_url              VARCHAR(500),
    -- Horario
    schedule              VARCHAR(1000),
    -- Timestamps
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinics_access_code ON clinics(access_code);

-- ─── 3. USERS ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id    VARCHAR(255) NOT NULL UNIQUE,
    clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,   -- NULL para superadmin
    role        user_role    NOT NULL DEFAULT 'receptionist',
    full_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id  ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);

-- ─── 4. PATIENTS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name   VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    email       VARCHAR(255),
    birth_date  DATE,
    gender      VARCHAR(20),
    address     TEXT,
    notes       TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);

-- ─── 5. APPOINTMENTS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id        UUID NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
    patient_id       UUID NOT NULL REFERENCES patients(id)  ON DELETE RESTRICT,
    doctor_id        UUID NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,
    appointment_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER     NOT NULL DEFAULT 30,
    reason           TEXT,
    status           appointment_status NOT NULL DEFAULT 'programada',
    notes            TEXT,
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id  ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id  ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date       ON appointments(clinic_id, appointment_date);

-- ─── 6. MEDICAL RECORDS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS medical_records (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id      UUID NOT NULL REFERENCES clinics(id)      ON DELETE CASCADE,
    patient_id     UUID NOT NULL REFERENCES patients(id)     ON DELETE RESTRICT,
    doctor_id      UUID NOT NULL REFERENCES users(id)        ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id),
    diagnosis      TEXT,
    treatment      TEXT,
    notes          TEXT,
    prescription   TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_records_clinic_id   ON medical_records(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id  ON medical_records(patient_id);

-- ─── 7. MEDICAL RECORD ATTACHMENTS ───────────────────────────

CREATE TABLE IF NOT EXISTS medical_record_attachments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id         UUID NOT NULL REFERENCES clinics(id)         ON DELETE CASCADE,
    medical_record_id UUID NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
    file_name         VARCHAR(255) NOT NULL,
    file_url          TEXT         NOT NULL,
    file_size_bytes   INTEGER,
    mime_type         VARCHAR(100),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_record_id ON medical_record_attachments(medical_record_id);

-- ─── 8. INVOICES ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id      UUID NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
    patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50)    NOT NULL,
    subtotal       NUMERIC(12,2)  NOT NULL DEFAULT 0,
    tax            NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total          NUMERIC(12,2)  NOT NULL DEFAULT 0,
    status         invoice_status NOT NULL DEFAULT 'pendiente',
    notes          TEXT,
    issued_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    UNIQUE (clinic_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id   ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id  ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(clinic_id, status);

-- ─── 9. PAYMENTS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id      UUID NOT NULL REFERENCES clinics(id)   ON DELETE CASCADE,
    invoice_id     UUID NOT NULL REFERENCES invoices(id)  ON DELETE RESTRICT,
    patient_id     UUID NOT NULL REFERENCES patients(id)  ON DELETE RESTRICT,
    amount         NUMERIC(12,2)  NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'efectivo',
    reference      VARCHAR(255),
    notes          TEXT,
    paid_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_clinic_id  ON payments(clinic_id);

-- ─── 10. WHATSAPP LOGS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_logs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id      UUID NOT NULL REFERENCES clinics(id)      ON DELETE CASCADE,
    patient_id     UUID NOT NULL REFERENCES patients(id)     ON DELETE RESTRICT,
    appointment_id UUID REFERENCES appointments(id),
    phone_number   VARCHAR(50)         NOT NULL,
    message_body   TEXT                NOT NULL,
    status         whatsapp_log_status NOT NULL DEFAULT 'pendiente',
    error_detail   TEXT,
    sent_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_clinic_id ON whatsapp_logs(clinic_id);

-- ─── 11. FOLLOW-UP REMINDERS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS follow_up_reminders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID NOT NULL REFERENCES clinics(id)         ON DELETE CASCADE,
    patient_id  UUID NOT NULL REFERENCES patients(id)        ON DELETE RESTRICT,
    record_id   UUID REFERENCES medical_records(id)          ON DELETE SET NULL,
    doctor_id   UUID NOT NULL REFERENCES users(id)           ON DELETE RESTRICT,
    due_date    DATE        NOT NULL,
    notes       TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_clinic_id   ON follow_up_reminders(clinic_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_patient_id  ON follow_up_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_due_date    ON follow_up_reminders(due_date);

-- ─── 12. CONSENT TEMPLATES ───────────────────────────────────

CREATE TABLE IF NOT EXISTS consent_templates (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    content     TEXT         NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by  UUID         NOT NULL REFERENCES users(id)   ON DELETE RESTRICT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_templates_clinic ON consent_templates(clinic_id);

-- ─── 13. PATIENT CONSENTS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS patient_consents (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id         UUID NOT NULL REFERENCES clinics(id)           ON DELETE CASCADE,
    patient_id        UUID NOT NULL REFERENCES patients(id)          ON DELETE RESTRICT,
    template_id       UUID NOT NULL REFERENCES consent_templates(id) ON DELETE RESTRICT,
    medical_record_id UUID REFERENCES medical_records(id)            ON DELETE SET NULL,
    signed_by         UUID NOT NULL REFERENCES users(id)             ON DELETE RESTRICT,
    pdf_path          TEXT         NOT NULL,
    signed_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient  ON patient_consents(clinic_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_template ON patient_consents(template_id);

-- ─── 14. INVENTORY ITEMS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID         NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    name        VARCHAR(200) NOT NULL,
    category    VARCHAR(50)  NOT NULL DEFAULT 'otros',
    unit        VARCHAR(50)  NOT NULL DEFAULT 'unidad',
    sku         VARCHAR(100),
    stock       INTEGER      NOT NULL DEFAULT 0  CHECK (stock >= 0),
    min_stock   INTEGER      NOT NULL DEFAULT 5  CHECK (min_stock >= 0),
    cost_price  NUMERIC(10,2),
    supplier    VARCHAR(200),
    notes       TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_clinic    ON inventory_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category  ON inventory_items(clinic_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON inventory_items(clinic_id, stock, min_stock);

-- ─── 15. INVENTORY MOVEMENTS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_movements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id   UUID        NOT NULL REFERENCES clinics(id)        ON DELETE CASCADE,
    item_id     UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users(id)                          ON DELETE SET NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('entrada', 'salida', 'ajuste')),
    quantity    INTEGER     NOT NULL,
    reason      VARCHAR(300),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item   ON inventory_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_clinic ON inventory_movements(clinic_id, created_at DESC);

-- ─── 16. TRIGGER updated_at para inventory_items ─────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER trg_inventory_items_updated_at
    BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 17. SUPERADMIN: promover usuario ────────────────────────
-- Descomenta y cambia el email DESPUÉS de que el usuario haga
-- su primer login (para que exista en la tabla users).

-- UPDATE users
-- SET role = 'superadmin', clinic_id = NULL
-- WHERE email = 'admin@medcontrol.dev';

-- ─── FIN ─────────────────────────────────────────────────────
SELECT 'Migración completa ejecutada correctamente ✓' AS resultado;
