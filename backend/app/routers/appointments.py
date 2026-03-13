import uuid
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole, RequireReception, RequireAdmin, RequireClinical
from app.models.appointment import Appointment
from app.schemas import AppointmentCreate, AppointmentOut, AppointmentUpdate
from app.services.whatsapp import schedule_reminder

router = APIRouter(prefix="/api/appointments", tags=["Citas"])


@router.get("", response_model=list[AppointmentOut], dependencies=[RequireAnyRole])
async def list_appointments(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    doctor_id: uuid.UUID | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
):
    q = select(Appointment).where(Appointment.clinic_id == current_user.clinic_id)

    # Doctores solo ven sus propias citas
    if current_user.role == "doctor":
        q = q.where(Appointment.doctor_id == current_user.id)
    elif doctor_id:
        q = q.where(Appointment.doctor_id == doctor_id)

    if status:
        q = q.where(Appointment.status == status)
    if date_from:
        q = q.where(Appointment.appointment_date >= date_from)
    if date_to:
        q = q.where(Appointment.appointment_date <= date_to)

    q = q.offset(skip).limit(limit).order_by(Appointment.appointment_date)
    result = await db.execute(q)
    return result.scalars().all()


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
    await db.refresh(appointment)

    # Programar recordatorio WhatsApp (no-crítico, no debe romper la cita)
    try:
        await schedule_reminder(appointment, db)
    except Exception:
        pass

    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentOut, dependencies=[RequireAnyRole])
async def update_appointment(
    appointment_id: uuid.UUID,
    body: AppointmentUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Appointment).where(
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
    return appt
