import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole
from app.models.appointment import Appointment
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.services.whatsapp import schedule_reminder

router = APIRouter(prefix="/api/appointments", tags=["Citas"])

# ── Helpers ───────────────────────────────────────────────────────────────────

def _with_relations():
    """Opción de carga eagerly las relaciones patient y doctor en una consulta."""
    return [selectinload(Appointment.patient), selectinload(Appointment.doctor)]


def _enrich(appt: Appointment) -> AppointmentOut:
    """Convierte un ORM Appointment en AppointmentOut con patient_name y doctor_name incluidos.
    Toda la lógica de nombre vive en el backend; el frontend recibe datos listos para mostrar."""
    out = AppointmentOut.model_validate(appt)
    out.patient_name = appt.patient.full_name if appt.patient else None
    out.doctor_name = appt.doctor.full_name if appt.doctor else None
    return out


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AppointmentOut], dependencies=[RequireAnyRole])
async def list_appointments(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    doctor_id: uuid.UUID | None = None,
    patient_id: uuid.UUID | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
):
    q = (
        select(Appointment)
        .options(*_with_relations())
        .where(Appointment.clinic_id == current_user.clinic_id)
    )

    # Doctores solo ven sus propias citas
    if current_user.role == "doctor":
        q = q.where(Appointment.doctor_id == current_user.id)
    elif doctor_id:
        q = q.where(Appointment.doctor_id == doctor_id)

    if patient_id:
        q = q.where(Appointment.patient_id == patient_id)
    if status:
        q = q.where(Appointment.status == status)
    if date_from:
        q = q.where(Appointment.appointment_date >= date_from)
    if date_to:
        q = q.where(Appointment.appointment_date <= date_to)

    q = q.offset(skip).limit(limit).order_by(Appointment.appointment_date)
    result = await db.execute(q)
    return [_enrich(a) for a in result.scalars().all()]


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireAnyRole])
async def create_appointment(
    body: AppointmentCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    appointment = Appointment(
        **body.model_dump(),
        clinic_id=current_user.clinic_id,
        created_by=current_user.id,
    )
    db.add(appointment)
    await db.flush()

    # Recargar con relaciones para devolver patient_name y doctor_name
    result = await db.execute(
        select(Appointment)
        .options(*_with_relations())
        .where(Appointment.id == appointment.id)
    )
    appointment = result.scalar_one()

    # Programar recordatorio WhatsApp (no-crítico, no debe romper la cita)
    try:
        await schedule_reminder(appointment, db)
    except Exception:
        pass

    return _enrich(appointment)


@router.patch("/{appointment_id}", response_model=AppointmentOut, dependencies=[RequireAnyRole])
async def update_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Appointment)
        .options(*_with_relations())
        .where(
            Appointment.id == appointment_id,
            Appointment.clinic_id == current_user.clinic_id,
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Cita no encontrada")

    # Doctores solo pueden modificar sus propias citas
    if current_user.role == "doctor" and appt.doctor_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tenés permiso para modificar esta cita")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(appt, field, value)

    await db.flush()
    await db.refresh(appt)
    return _enrich(appt)
