-- Migración: campos completos del perfil de clínica médica
-- Ejecutar en Supabase SQL Editor

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS legal_id       VARCHAR(50),         -- Cédula jurídica / RUC
  ADD COLUMN IF NOT EXISTS specialty      VARCHAR(100),        -- Tipo de clínica (general, dental, etc.)
  ADD COLUMN IF NOT EXISTS schedule       TEXT,                -- Horario de atención (texto libre)
  ADD COLUMN IF NOT EXISTS city           VARCHAR(100),        -- Ciudad / Cantón
  ADD COLUMN IF NOT EXISTS province       VARCHAR(100),        -- Provincia / Estado
  ADD COLUMN IF NOT EXISTS country        VARCHAR(100) DEFAULT 'Costa Rica',
  ADD COLUMN IF NOT EXISTS postal_code    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS whatsapp       VARCHAR(50),
  ADD COLUMN IF NOT EXISTS second_phone   VARCHAR(50),
  ADD COLUMN IF NOT EXISTS website        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS instagram      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS facebook       VARCHAR(255),
  ADD COLUMN IF NOT EXISTS logo_url       TEXT;                -- URL del logo (Supabase Storage o externa)
