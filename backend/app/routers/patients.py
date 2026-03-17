import uuid
from datetime import date
from typing import Annotated, Any
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole, RequireReception, RequireAdmin, RequireClinical
from app.models.patient import Patient
from app.schemas import PatientCreate, PatientOut, PatientUpdate
from app.services.patient_import import (
    generate_csv_template,
    parse_file,
    build_preview,
)


class ImportConfirmRequest(BaseModel):
    """Payload que el frontend envía para confirmar la importación."""
    rows: list[dict[str, Any]]
    include_duplicates: bool = False
    duplicate_rows: list[dict[str, Any]] = []

router = APIRouter(prefix="/api/patients", tags=["Pacientes"])


@router.get("", response_model=list[PatientOut], dependencies=[RequireAnyRole])
async def list_patients(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(None, max_length=200),
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


# ── Importación masiva ─────────────────────────────────────────────────────────
# IMPORTANTE: estas rutas deben estar ANTES de /{patient_id} para que FastAPI
# no capture la palabra "import" como un UUID de paciente.

@router.get("/import/template", dependencies=[RequireAnyRole])
async def download_import_template():
    """Descarga la plantilla CSV para importación de pacientes."""
    content = generate_csv_template()
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=plantilla_pacientes.csv"},
    )


@router.post("/import/preview", dependencies=[RequireAnyRole])
async def preview_import(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
):
    """
    Parsea y valida el archivo (CSV/XLSX) sin guardar nada.
    Devuelve: filas válidas, inválidas y duplicadas.
    """
    if file.size and file.size > 5 * 1024 * 1024:  # 5 MB máximo
        raise HTTPException(status_code=400, detail="El archivo no puede superar 5 MB")

    content = await file.read()
    rows, parse_error = parse_file(content, file.filename or "file.csv")
    if parse_error:
        raise HTTPException(status_code=422, detail=parse_error)

    if len(rows) > 2000:
        raise HTTPException(status_code=400, detail="El archivo no puede tener más de 2000 filas por importación")

    # Cargar emails y teléfonos existentes para detectar duplicados
    existing = await db.execute(
        select(Patient.email, Patient.phone).where(
            Patient.clinic_id == current_user.clinic_id,
            Patient.is_active == True,
        )
    )
    rows_data = existing.all()
    existing_emails = {r.email.lower() for r in rows_data if r.email}
    existing_phones = {r.phone for r in rows_data if r.phone}

    preview = build_preview(rows, existing_emails, existing_phones)
    return preview.to_dict()


@router.post("/import", dependencies=[RequireAnyRole])
async def confirm_import(
    body: ImportConfirmRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Crea los pacientes confirmados. Acepta las filas válidas
    y opcionalmente las duplicadas (si el usuario elige importarlas igual).
    """
    rows_to_import = list(body.rows)
    if body.include_duplicates:
        rows_to_import += [d["patient"] for d in body.duplicate_rows]

    if not rows_to_import:
        raise HTTPException(status_code=400, detail="No hay filas para importar")

    if len(rows_to_import) > 2000:
        raise HTTPException(status_code=400, detail="Máximo 2000 pacientes por importación")

    created = 0
    errors: list[dict] = []

    for i, row in enumerate(rows_to_import):
        try:
            birth_date_val: date | None = None
            if row.get("birth_date"):
                from datetime import datetime
                for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                    try:
                        birth_date_val = datetime.strptime(row["birth_date"], fmt).date()
                        break
                    except ValueError:
                        continue

            patient = Patient(
                clinic_id=current_user.clinic_id,
                full_name=row["full_name"],
                phone=row.get("phone") or None,
                email=row.get("email") or None,
                birth_date=birth_date_val,
                gender=row.get("gender") or None,
                address=row.get("address") or None,
                notes=row.get("notes") or None,
            )
            db.add(patient)
            created += 1
        except Exception as e:
            errors.append({"row_index": i, "name": row.get("full_name", "?"), "error": str(e)})

    await db.flush()

    return {
        "imported": created,
        "skipped": len(errors),
        "errors": errors,
    }


# ── Paciente individual ────────────────────────────────────────────────────────
# Estas rutas van AL FINAL para que /{patient_id} no capture "import" ni otros segmentos fijos.

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
