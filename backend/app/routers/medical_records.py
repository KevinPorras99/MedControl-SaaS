import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireDoctor
from app.models.medical_record import MedicalRecord, MedicalRecordAttachment
from app.schemas import MedicalRecordCreate, MedicalRecordOut, AttachmentOut
from app import storage

router = APIRouter(prefix="/api/records", tags=["Expedientes"])

ALLOWED_MIME = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


# ── GET expedientes de un paciente ────────────────────────────────────────────
@router.get("/{patient_id}")
async def get_patient_records(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if current_user.role == "receptionist":
        raise HTTPException(status_code=403, detail="Sin acceso a expedientes clínicos")

    q = (
        select(MedicalRecord)
        .options(selectinload(MedicalRecord.attachments))
        .where(
            MedicalRecord.clinic_id == current_user.clinic_id,
            MedicalRecord.patient_id == patient_id,
        )
    )
    if current_user.role == "doctor":
        q = q.where(MedicalRecord.doctor_id == current_user.id)
    q = q.order_by(MedicalRecord.created_at.desc())

    result = await db.execute(q)
    records = result.scalars().all()

    out = []
    for rec in records:
        rec_dict = MedicalRecordOut.model_validate(rec).model_dump()
        atts = []
        for att in rec.attachments:
            signed = await storage.get_signed_url(att.file_url)
            atts.append({
                "id": str(att.id),
                "file_name": att.file_name,
                "file_url": signed,
                "file_size_bytes": att.file_size_bytes,
                "mime_type": att.mime_type,
                "created_at": att.created_at.isoformat(),
            })
        rec_dict["attachments"] = atts
        out.append(rec_dict)

    return out


# ── POST nuevo expediente ─────────────────────────────────────────────────────
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


# ── DELETE archivo (definido ANTES de /{record_id}/... para evitar conflictos) ─
@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireDoctor])
async def delete_attachment(
    attachment_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(MedicalRecordAttachment).where(
            MedicalRecordAttachment.id == attachment_id,
            MedicalRecordAttachment.clinic_id == current_user.clinic_id,
        )
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Archivo no encontrado")

    await storage.delete_file(att.file_url)
    await db.delete(att)


# ── POST subir archivo a un expediente ───────────────────────────────────────
@router.post(
    "/{record_id}/attachments",
    response_model=AttachmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[RequireDoctor],
)
async def upload_attachment(
    record_id: uuid.UUID,
    file: Annotated[UploadFile, File(...)],
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(MedicalRecord).where(
            MedicalRecord.id == record_id,
            MedicalRecord.clinic_id == current_user.clinic_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")

    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(status_code=400, detail="Tipo de archivo no permitido. Use PDF, imagen o Word.")

    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Archivo demasiado grande (máx. 10 MB)")

    storage_path = storage.build_storage_path(current_user.clinic_id, record_id, file.filename)
    await storage.upload_file(storage_path, data, file.content_type)

    att = MedicalRecordAttachment(
        clinic_id=current_user.clinic_id,
        medical_record_id=record_id,
        file_name=file.filename,
        file_url=storage_path,  # guardamos el path, no la URL
        file_size_bytes=len(data),
        mime_type=file.content_type,
    )
    db.add(att)
    await db.flush()
    await db.refresh(att)

    signed = await storage.get_signed_url(storage_path)
    return AttachmentOut(
        id=att.id,
        file_name=att.file_name,
        file_url=signed,
        file_size_bytes=att.file_size_bytes,
        mime_type=att.mime_type,
        created_at=att.created_at,
    )
