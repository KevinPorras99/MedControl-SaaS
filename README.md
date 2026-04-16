# MedControl SaaS

Sistema de Gestión para Clínicas Privadas — v1.0

## Estructura del Proyecto

```
medcontrol/
├── backend/      → FastAPI + SQLAlchemy + Supabase (PostgreSQL)
└── frontend/     → React + Vite + Clerk + TanStack Query + Tailwind CSS
```

---

## Puesta en marcha

### 1. Base de datos

Ejecutá el SQL de migración completo en el **SQL Editor de Supabase**.

Si estás actualizando un proyecto existente, también corrés:

```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS access_code VARCHAR(10) UNIQUE;
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Completar variables
uvicorn app.main:app --reload --port 8000
```

Documentación disponible en: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # Completar variables
npm run dev
```

App disponible en: http://localhost:5173

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL con driver asyncpg (`postgresql+asyncpg://...`) |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk |
| `CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk |
| `WHATSAPP_TOKEN` | Token de WhatsApp Cloud API (opcional) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp (opcional) |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_live_...` o `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secreto del webhook de Stripe (`whsec_...`) |
| `STRIPE_PRICE_PROFESIONAL` | Price ID de Stripe para el plan Profesional |
| `STRIPE_PRICE_CLINICA` | Price ID de Stripe para el plan Clínica |
| `APP_FRONTEND_URL` | URL pública del frontend (default: `http://localhost:5173`) |

### Frontend (`frontend/.env.local`)

| Variable | Descripción |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk |
| `VITE_API_URL` | URL del backend (default: `http://localhost:8000`) |

---

## Arquitectura

- **Multi-tenant**: aislamiento por `clinic_id` en todas las tablas
- **Auth**: Clerk maneja sesiones; el backend valida el JWT via JWKS en cada request
- **Roles**: `admin_clinic` · `doctor` · `receptionist`
- **RLS**: Supabase bloquea accesos a nivel de base de datos como segunda capa de seguridad
- **Inmutabilidad**: `medical_records` y `payments` no se pueden modificar ni eliminar

---

## Flujo de onboarding

1. El usuario se registra en Clerk
2. En el primer acceso, se muestra la pantalla de configuración de cuenta
3. **Admin** → ingresa el nombre de la clínica → el sistema genera un código de acceso único de 6 caracteres
4. **Doctor / Recepcionista** → selecciona su clínica del dropdown y escribe el código de acceso que le dio el admin
5. El código de acceso siempre está visible en el sidebar para el admin (con botón de copiar)

---

## Módulos

| Módulo | Descripción |
|---|---|
| Pacientes | Registro, búsqueda y edición de pacientes de la clínica |
| Citas | Agendamiento, filtros por estado, cambio de estado inline |
| Expedientes | Historial médico por paciente, inmutable |
| Facturación | Emisión de facturas con múltiples servicios, IVA 13%, PDF imprimible |
| Recordatorios | Logs de WhatsApp pendientes (envío manual o por worker externo) |
| Reportes | Resumen financiero, ingresos por mes, top pacientes, exportación CSV |
| Suscripciones | Planes Stripe (Básico / Profesional / Clínica), Customer Portal |

---

## Usuarios de prueba

Crear estos usuarios en el **Dashboard de Clerk → Users → Create User**.
El rol se asigna en el onboarding al hacer el primer login.

| Rol | Email | Contraseña |
|---|---|---|
| `admin_clinic` | admin@medcontrol.dev | Mc$Admin#9x2Z! |
| `doctor` | doctor@medcontrol.dev | Mc$Dr#7kWp3N! |
| `receptionist` | recepcion@medcontrol.dev | Mc$Rec#4mQv8L! |

Codigo de acceso a clinica: I8OO0K2A

> Clerk requiere contraseñas con mayúsculas, minúsculas, números y símbolos.

---

## Asignar código de acceso a clínica existente

Si la clínica fue creada antes de la versión con códigos de acceso, asignalo manualmente en Supabase:

```sql
-- Ver clínicas y sus códigos actuales
SELECT id, name, access_code FROM clinics;

-- Asignar código a una clínica específica por su ID
UPDATE clinics
SET access_code = 'MED001'
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

---

## Migración de base de datos — Stripe

Ejectar en el **SQL Editor de Supabase** al actualizar a esta versión:

```sql
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS stripe_customer_id    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status    VARCHAR(50) DEFAULT 'inactive';

CREATE INDEX IF NOT EXISTS idx_clinics_stripe_customer ON clinics(stripe_customer_id);
```

---

## Roadmap pendiente

- [ ] Worker/cron para envío automático de recordatorios WhatsApp
- [x] Reportes financieros y exportación a CSV
- [x] Sistema de suscripciones (Stripe)
- [ ] Subida de archivos al expediente (Supabase Storage)
- [ ] Facturación electrónica regional (Hacienda CR)
- [ ] App móvil (React Native)
