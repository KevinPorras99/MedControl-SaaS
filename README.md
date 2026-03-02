# MedControl SaaS

Sistema de Gestión para Clínicas Privadas — v1.0

## Estructura del Proyecto

```
medcontrol/
├── backend/      → FastAPI + SQLAlchemy + Supabase
└── frontend/     → React + Vite + Clerk + TanStack Query
```

---

## Puesta en marcha

### 1. Base de datos
Corré el SQL de migración completo en el **SQL Editor de Supabase**.

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
cp .env.example .env            # Completar variables
npm run dev
```

App disponible en: http://localhost:5173

---

## Variables de entorno necesarias

### Backend (.env)
| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Clave anónima pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (para bypass RLS en WhatsApp logs) |
| `DATABASE_URL` | Conexión PostgreSQL directa (asyncpg) |
| `CLERK_SECRET_KEY` | Clave secreta de Clerk |
| `WHATSAPP_TOKEN` | Token de WhatsApp Cloud API (opcional) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de WhatsApp (opcional) |

### Frontend (.env)
| Variable | Descripción |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clave pública de Clerk |
| `VITE_API_URL` | URL del backend (default: http://localhost:8000) |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave anónima pública |

---

## Arquitectura

- **Multi-tenant**: aislamiento por `clinic_id` en todas las tablas
- **Auth**: Clerk maneja sesiones; el backend valida el JWT en cada request
- **RLS**: Supabase bloquea accesos a nivel de base de datos como segunda capa
- **Inmutabilidad**: `medical_records` y `payments` no se pueden modificar ni eliminar

## Roadmap pendiente

- [ ] Módulo de WhatsApp (worker/cron para envío de recordatorios)
- [ ] Reportes financieros
- [ ] Sistema de suscripciones (Stripe)
- [ ] Subida de archivos al expediente (Supabase Storage)
- [ ] Facturación electrónica regional
