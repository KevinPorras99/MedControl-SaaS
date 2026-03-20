import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireClinical
from app.models.follow_up_reminder import FollowUpReminder
from app.schemas import ReminderCreate, ReminderUpdate, ReminderOut

router = APIRouter(prefix="/api/reminders", tags=["Seguimientos"])


def _enrich(r: FollowUpReminder) -> ReminderOut:
    out = ReminderOut.model_validate(r)
    out.patient_name = r.patient.full_name if r.patient else None
    out.doctor_name = r.doctor.full_name if r.doctor else None
    return out


def _with_relations():
    return [selectinload(FollowUpReminder.patient), selectinload(FollowUpReminder.doctor)]


@router.get("", response_model=list[ReminderOut], dependencies=[RequireClinical])
async def list_reminders(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    patient_id: uuid.UUID | None = None,
    status: str | None = Query(None),
):
    q = (
        select(FollowUpReminder)
        .options(*_with_relations())
        .where(FollowUpReminder.clinic_id == current_user.clinic_id)
    )
    if current_user.role == "doctor":
        q = q.where(FollowUpReminder.doctor_id == current_user.id)
    if patient_id:
        q = q.where(FollowUpReminder.patient_id == patient_id)
    if status:
        q = q.where(FollowUpReminder.status == status)
    q = q.order_by(FollowUpReminder.due_date.asc())
    result = await db.execute(q)
    return [_enrich(r) for r in result.scalars().all()]


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireClinical])
async def create_reminder(
    body: ReminderCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    reminder = FollowUpReminder(
        **body.model_dump(),
        clinic_id=current_user.clinic_id,
        doctor_id=current_user.id,
    )
    db.add(reminder)
    await db.flush()
    result = await db.execute(
        select(FollowUpReminder).options(*_with_relations()).where(FollowUpReminder.id == reminder.id)
    )
    return _enrich(result.scalar_one())


@router.patch("/{reminder_id}", response_model=ReminderOut, dependencies=[RequireClinical])
async def update_reminder(
    reminder_id: uuid.UUID,
    body: ReminderUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(FollowUpReminder)
        .options(*_with_relations())
        .where(
            FollowUpReminder.id == reminder_id,
            FollowUpReminder.clinic_id == current_user.clinic_id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(reminder, field, value)
    await db.flush()
    await db.refresh(reminder)
    return _enrich(reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireClinical])
async def delete_reminder(
    reminder_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(FollowUpReminder).where(
            FollowUpReminder.id == reminder_id,
            FollowUpReminder.clinic_id == current_user.clinic_id,
        )
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="Seguimiento no encontrado")
    await db.delete(reminder)
