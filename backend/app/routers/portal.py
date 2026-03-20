"""
portal.py — Endpoints públicos del portal del paciente.
Auth: JWT propio (no Clerk). Todos usan el helper get_portal_patient.
"""
import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.invoice import Invoice
from app.models.medical_record import MedicalRecord
from app.models.user import User
from app.services.portal_auth import verify_portal_token
from app.services.email import send_appointment_confirmation
from app.config import settings

router = APIRouter(prefix="/api/portal", tags=["Portal Paciente"])

_bearer = HTTPBearer()


# ── Dependencia de auth del portal ────────────────────────────────────────────
async def get_portal_patient(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> tuple[Patient, uuid.UUID]:
    """Valida el JWT del portal y retorna (patient, clinic_id)."""
    payload = verify_portal_token(credentials.credentials)
    patient_id = uuid.UUID(payload["sub"])
    clinic_id = uuid.UUID(payload["clinic_id"])

    result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.clinic_id == clinic_id,
            Patient.is_active == True,
        )
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient, clinic_id


PortalPatient = Annotated[tuple[Patient, uuid.UUID], Depends(get_portal_patient)]


# ── GET /api/portal/me ────────────────────────────────────────────────────────
@router.get("/me")
async def portal_me(ctx: PortalPatient):
    patient, _ = ctx
    return {
        "id": str(patient.id),
        "full_name": patient.full_name,
        "email": patient.email,
        "phone": patient.phone,
        "birth_date": patient.birth_date.isoformat() if patient.birth_date else None,
        "gender": patient.gender,
    }


# ── GET /api/portal/appointments ─────────────────────────────────────────────
@router.get("/appointments")
async def portal_appointments(
    ctx: PortalPatient,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    patient, clinic_id = ctx
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(Appointment)
        .options(selectinload(Appointment.doctor))
        .where(
            Appointment.patient_id == patient.id,
            Appointment.clinic_id == clinic_id,
            Appointment.appointment_date >= now,
            Appointment.status.in_(["programada", "confirmada"]),
        )
        .order_by(Appointment.appointment_date.asc())
        .limit(20)
    )
    appointments = result.scalars().all()

    return [
        {
            "id": str(a.id),
            "appointment_date": a.appointment_date.isoformat(),
            "duration_minutes": a.duration_minutes,
            "status": a.status,
            "reason": a.reason,
            "doctor_name": a.doctor.full_name if a.doctor else None,
        }
        for a in appointments
    ]


# ── GET /api/portal/invoices ──────────────────────────────────────────────────
@router.get("/invoices")
async def portal_invoices(
    ctx: PortalPatient,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    patient, clinic_id = ctx

    result = await db.execute(
        select(Invoice)
        .where(
            Invoice.patient_id == patient.id,
            Invoice.clinic_id == clinic_id,
        )
        .order_by(Invoice.issued_at.desc())
        .limit(50)
    )
    invoices = result.scalars().all()

    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "total": str(inv.total),
            "status": inv.status,
            "issued_at": inv.issued_at.isoformat(),
        }
        for inv in invoices
    ]


# ── GET /api/portal/records ───────────────────────────────────────────────────
@router.get("/records")
async def portal_records(
    ctx: PortalPatient,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Resumen del historial clínico — sin texto completo de prescripción por privacidad."""
    patient, clinic_id = ctx

    result = await db.execute(
        select(MedicalRecord)
        .options(selectinload(MedicalRecord.doctor))
        .where(
            MedicalRecord.patient_id == patient.id,
            MedicalRecord.clinic_id == clinic_id,
        )
        .order_by(MedicalRecord.created_at.desc())
        .limit(50)
    )
    records = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "created_at": r.created_at.isoformat(),
            "doctor_name": r.doctor.full_name if r.doctor else None,
            "diagnosis": r.diagnosis,
            "has_prescription": bool(r.prescription),
        }
        for r in records
    ]


# ── POST /api/portal/appointment-request ─────────────────────────────────────
@router.post("/appointment-request", status_code=status.HTTP_201_CREATED)
async def portal_request_appointment(
    body: dict,
    ctx: PortalPatient,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    El paciente solicita una cita. Envía email a la clínica.
    No crea la cita directamente — el staff la confirma manualmente.
    """
    from app.models.clinic import Clinic
    from app.services.email import send_appointment_confirmation
    import logging

    patient, clinic_id = ctx
    preferred_date = body.get("preferred_date", "Sin especificar")
    reason = body.get("reason", "")
    notes = body.get("notes", "")

    logger = logging.getLogger(__name__)

    # Obtener email de la clínica
    clinic_result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
    clinic = clinic_result.scalar_one_or_none()

    if clinic and clinic.email:
        import resend as _resend
        if settings.resend_api_key:
            def _send_request():
                _resend.api_key = settings.resend_api_key
                _resend.Emails.send({
                    "from": settings.resend_email_from,
                    "to": [clinic.email],
                    "subject": f"Solicitud de cita — {patient.full_name}",
                    "html": f"""
                    <p>El paciente <strong>{patient.full_name}</strong> ha solicitado una cita a través del portal.</p>
                    <ul>
                      <li><strong>Fecha preferida:</strong> {preferred_date}</li>
                      <li><strong>Motivo:</strong> {reason or '—'}</li>
                      <li><strong>Notas:</strong> {notes or '—'}</li>
                      <li><strong>Email:</strong> {patient.email or '—'}</li>
                      <li><strong>Teléfono:</strong> {patient.phone or '—'}</li>
                    </ul>
                    """,
                })
            import asyncio
            try:
                await asyncio.to_thread(_send_request)
            except Exception as exc:
                logger.error("[Portal] Error enviando solicitud de cita: %s", exc)
        else:
            logger.info("[Portal SIMULADO] Solicitud de cita de %s para %s", patient.full_name, preferred_date)

    return {"message": "Solicitud enviada. El equipo se contactará contigo pronto."}
