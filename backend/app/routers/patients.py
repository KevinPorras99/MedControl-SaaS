import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole, RequireReception, RequireAdmin, RequireClinical
from app.models.patient import Patient
from app.schemas import PatientCreate, PatientOut, PatientUpdate

router = APIRouter(prefix="/api/patients", tags=["Pacientes"])


@router.get("", response_model=list[PatientOut], dependencies=[RequireAnyRole])
async def list_patients(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, le=500),
):
    q = select(Patient).where(
        Patient.clinic_id == current_user.clinic_id,
        Patient.is_active == True,
    )
    if search:
        q = q.where(Patient.full_name.ilike(f"%{search}%"))
    q = q.offset(skip).limit(limit).order_by(Patient.full_name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=PatientOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireAnyRole])
async def create_patient(
    body: PatientCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    patient = Patient(**body.model_dump(), clinic_id=current_user.clinic_id)
    db.add(patient)
    await db.flush()
    await db.refresh(patient)
    return patient


@router.get("/{patient_id}", response_model=PatientOut, dependencies=[RequireAnyRole])
async def get_patient(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.clinic_id == current_user.clinic_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    return patient


@router.patch("/{patient_id}", response_model=PatientOut, dependencies=[RequireClinical])
async def update_patient(
    patient_id: uuid.UUID,
    body: PatientUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.clinic_id == current_user.clinic_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    await db.flush()
    await db.refresh(patient)
    return patient
