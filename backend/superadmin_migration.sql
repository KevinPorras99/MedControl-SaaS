-- Migración: rol superadmin
-- Ejecutar en Supabase SQL Editor ANTES de reiniciar el backend

-- 1. Agregar el valor 'superadmin' al enum de roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'superadmin';

-- 2. Hacer clinic_id nullable (el superadmin no pertenece a ninguna clínica)
ALTER TABLE users ALTER COLUMN clinic_id DROP NOT NULL;

-- 3. Promover al primer superadmin (reemplazá el email con el tuyo)
-- UPDATE users SET role = 'superadmin', clinic_id = NULL
-- WHERE email = 'tu@email.com';
