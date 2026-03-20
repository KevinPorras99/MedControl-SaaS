import asyncio
import os
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireDoctor, RequireClinical
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

# Magic byte signatures for each allowed MIME type.
# Verifying the actual file bytes prevents clients from bypassing MIME checks
# by simply lying about the Content-Type of a malicious file.
_MAGIC: dict[str, list[bytes]] = {
    "application/pdf":   [b"%PDF"],
    "image/jpeg":        [b"\xFF\xD8\xFF"],
    "image/png":         [b"\x89PNG\r\n\x1a\n"],
    "image/webp":        [b"RIFF"],          # bytes 0-3; bytes 8-11 must be b"WEBP"
    "image/gif":         [b"GIF87a", b"GIF89a"],
    "application/msword": [b"\xD0\xCF\x11\xE0"],  # OLE2 compound document
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [b"PK\x03\x04"],
}


def _magic_ok(data: bytes, mime: str) -> bool:
    """Return True if the file's leading bytes match the expected magic for its MIME type."""
    header = data[:12]
    for sig in _MAGIC.get(mime, []):
        if header.startswith(sig):
            if mime == "image/webp":
                return len(data) >= 12 and data[8:12] == b"WEBP"
            return True
    return False


# ── GET expedientes de un paciente ────────────────────────────────────────────
@router.get("/{patient_id}", dependencies=[RequireClinical])
async def get_patient_records(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):

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

    async def _sign_att(att) -> dict:
        """Firma la URL de un adjunto. Se ejecuta en paralelo vía asyncio.gather."""
        signed = await storage.get_signed_url(att.file_url)
        return {
            "id": str(att.id),
            "file_name": att.file_name,
            "file_url": signed,
            "file_size_bytes": att.file_size_bytes,
            "mime_type": att.mime_type,
            "created_at": att.created_at.isoformat(),
        }

    out = []
    for rec in records:
        rec_dict = MedicalRecordOut.model_validate(rec).model_dump()
        # Antes: sequential await por cada adjunto (N * 100ms)
        # Ahora: gather paralelo — todos los adjuntos se firman a la vez
        rec_dict["attachments"] = list(
            await asyncio.gather(*[_sign_att(att) for att in rec.attachments])
        ) if rec.attachments else []
        out.append(rec_dict)

    return out


# ── POST nuevo expediente ─────────────────────────────────────────────────────
@router.post("", response_model=MedicalRecordOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireClinical])
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
@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireClinical])
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
    dependencies=[RequireClinical],
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

    # Verify actual file content matches the declared MIME type
    if not _magic_ok(data, file.content_type):
        raise HTTPException(status_code=400, detail="El contenido del archivo no coincide con su tipo declarado.")

    # Use a UUID-based storage path to prevent path traversal attacks.
    # Keep the original filename only for display purposes (file_name field).
    original_name = file.filename or "archivo"
    safe_ext = os.path.splitext(original_name)[1].lower()[:10]
    # Whitelist extensions derived from allowed MIME types
    allowed_ext = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".doc", ".docx"}
    if safe_ext not in allowed_ext:
        safe_ext = ""
    safe_storage_name = f"{uuid.uuid4()}{safe_ext}"

    storage_path = storage.build_storage_path(current_user.clinic_id, record_id, safe_storage_name)
    await storage.upload_file(storage_path, data, file.content_type)

    att = MedicalRecordAttachment(
        clinic_id=current_user.clinic_id,
        medical_record_id=record_id,
        file_name=original_name[:255],  # display name capped to avoid DB overflow
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


# ── GET exportar expediente en PDF ───────────────────────────────────────────
@router.get("/{patient_id}/export/pdf", dependencies=[RequireClinical])
async def export_patient_pdf(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from fastapi.responses import Response as FastAPIResponse
    from app.models.patient import Patient
    from app.models.clinic import Clinic
    from app.services.pdf_records import generate_patient_record_pdf

    pat_result = await db.execute(
        select(Patient).where(
            Patient.id == patient_id,
            Patient.clinic_id == current_user.clinic_id,
        )
    )
    patient = pat_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    q = (
        select(MedicalRecord)
        .options(
            selectinload(MedicalRecord.attachments),
            selectinload(MedicalRecord.doctor),
        )
        .where(
            MedicalRecord.clinic_id == current_user.clinic_id,
            MedicalRecord.patient_id == patient_id,
        )
        .order_by(MedicalRecord.created_at.asc())
    )
    if current_user.role == "doctor":
        q = q.where(MedicalRecord.doctor_id == current_user.id)

    rec_result = await db.execute(q)
    records = rec_result.scalars().all()

    clinic_result = await db.execute(
        select(Clinic).where(Clinic.id == current_user.clinic_id)
    )
    clinic = clinic_result.scalar_one_or_none()
    clinic_name = clinic.name if clinic else "Clinica"

    pdf_bytes = await generate_patient_record_pdf(patient, records, clinic_name)

    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=expediente_{patient_id}.pdf"},
    )


# ── GET receta en PDF ─────────────────────────────────────────────────────────
@router.get("/{record_id}/prescription/pdf", dependencies=[RequireClinical])
async def export_prescription_pdf(
    record_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from fastapi.responses import Response as FastAPIResponse
    from app.models.patient import Patient
    from app.models.clinic import Clinic
    from app.models.user import User
    from app.services.pdf_prescription import generate_prescription_pdf
    from app.config import settings

    result = await db.execute(
        select(MedicalRecord)
        .options(
            selectinload(MedicalRecord.doctor),
            selectinload(MedicalRecord.patient),
        )
        .where(
            MedicalRecord.id == record_id,
            MedicalRecord.clinic_id == current_user.clinic_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Expediente no encontrado")
    if not record.prescription:
        raise HTTPException(status_code=400, detail="Este expediente no tiene receta")

    clinic_result = await db.execute(
        select(Clinic).where(Clinic.id == current_user.clinic_id)
    )
    clinic = clinic_result.scalar_one_or_none()

    pdf_bytes = await generate_prescription_pdf(
        record=record,
        patient=record.patient,
        doctor=record.doctor,
        clinic=clinic,
        frontend_url=settings.app_frontend_url,
    )

    return FastAPIResponse(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=receta_{record_id}.pdf"},
    )
