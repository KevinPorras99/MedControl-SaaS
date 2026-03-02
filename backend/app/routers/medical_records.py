import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import CurrentUser, RequireDoctor, RequireAnyRole
from app.models.medical_record import MedicalRecord
from app.schemas import MedicalRecordCreate, MedicalRecordOut

router = APIRouter(prefix="/api/records", tags=["Expedientes"])


@router.get("/{patient_id}", response_model=list[MedicalRecordOut])
async def get_patient_records(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Receptionist no puede ver expedientes
    if current_user.role == "receptionist":
        raise HTTPException(status_code=403, detail="Sin acceso a expedientes clínicos")

    q = select(MedicalRecord).where(
        MedicalRecord.clinic_id == current_user.clinic_id,
        MedicalRecord.patient_id == patient_id,
    )
    # Doctor solo ve los expedientes que él creó
    if current_user.role == "doctor":
        q = q.where(MedicalRecord.doctor_id == current_user.id)

    q = q.order_by(MedicalRecord.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=MedicalRecordOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireDoctor])
async def create_record(
    body: MedicalRecordCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    record = MedicalRecord(
        **body.model_dump(),
        clinic_id=current_user.clinic_id,
        doctor_id=current_user.id,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return record
