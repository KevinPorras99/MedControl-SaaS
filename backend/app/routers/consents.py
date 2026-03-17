import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireAdmin, RequireClinical
from app.models.consent import ConsentTemplate, PatientConsent
from app.models.patient import Patient
from app.models.clinic import Clinic
from app.schemas import (
    ConsentTemplateCreate, ConsentTemplateUpdate, ConsentTemplateOut,
    PatientConsentCreate, PatientConsentOut,
)
from app import storage

router = APIRouter(prefix="/api/consents", tags=["Consentimientos"])


# ── Templates ─────────────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[ConsentTemplateOut], dependencies=[RequireClinical])
async def list_templates(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    include_inactive: bool = False,
):
    q = select(ConsentTemplate).where(ConsentTemplate.clinic_id == current_user.clinic_id)
    if not include_inactive:
        q = q.where(ConsentTemplate.is_active == True)
    q = q.order_by(ConsentTemplate.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/templates", response_model=ConsentTemplateOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireAdmin])
async def create_template(
    body: ConsentTemplateCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    tmpl = ConsentTemplate(
        **body.model_dump(),
        clinic_id=current_user.clinic_id,
        created_by=current_user.id,
    )
    db.add(tmpl)
    await db.flush()
    await db.refresh(tmpl)
    return tmpl


@router.patch("/templates/{template_id}", response_model=ConsentTemplateOut, dependencies=[RequireAdmin])
async def update_template(
    template_id: uuid.UUID,
    body: ConsentTemplateUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ConsentTemplate).where(
            ConsentTemplate.id == template_id,
            ConsentTemplate.clinic_id == current_user.clinic_id,
        )
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(tmpl, field, value)
    await db.flush()
    await db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireAdmin])
async def delete_template(
    template_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(ConsentTemplate).where(
            ConsentTemplate.id == template_id,
            ConsentTemplate.clinic_id == current_user.clinic_id,
        )
    )
    tmpl = result.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    tmpl.is_active = False
    await db.flush()


# ── Patient consents ──────────────────────────────────────────────────────────

@router.get("/{patient_id}", response_model=list[PatientConsentOut], dependencies=[RequireClinical])
async def list_patient_consents(
    patient_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(PatientConsent)
        .options(selectinload(PatientConsent.template))
        .where(
            PatientConsent.clinic_id == current_user.clinic_id,
            PatientConsent.patient_id == patient_id,
        )
        .order_by(PatientConsent.signed_at.desc())
    )
    consents = result.scalars().all()

    out = []
    for c in consents:
        signed_url = await storage.get_signed_url(c.pdf_path)
        out.append(PatientConsentOut(
            id=c.id,
            clinic_id=c.clinic_id,
            patient_id=c.patient_id,
            template_id=c.template_id,
            medical_record_id=c.medical_record_id,
            signed_by=c.signed_by,
            pdf_url=signed_url,
            signed_at=c.signed_at,
            template_title=c.template.title if c.template else None,
        ))
    return out


@router.post("", response_model=PatientConsentOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireClinical])
async def sign_consent(
    body: PatientConsentCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.services.pdf_consent import generate_consent_pdf

    pat_result = await db.execute(
        select(Patient).where(
            Patient.id == body.patient_id,
            Patient.clinic_id == current_user.clinic_id,
        )
    )
    patient = pat_result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")

    tmpl_result = await db.execute(
        select(ConsentTemplate).where(
            ConsentTemplate.id == body.template_id,
            ConsentTemplate.clinic_id == current_user.clinic_id,
            ConsentTemplate.is_active == True,
        )
    )
    template = tmpl_result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada o inactiva")

    clinic_result = await db.execute(
        select(Clinic).where(Clinic.id == current_user.clinic_id)
    )
    clinic = clinic_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    pdf_bytes = await generate_consent_pdf(
        clinic_name=clinic.name if clinic else "Clínica",
        clinic_address=clinic.address if clinic else None,
        template_title=template.title,
        template_content=template.content,
        patient_name=patient.full_name,
        signed_at=now,
        signer_name=current_user.full_name,
        signature_data_url=body.signature_data_url,
    )

    consent_id = uuid.uuid4()
    storage_path = f"{current_user.clinic_id}/consents/{consent_id}.pdf"
    await storage.upload_file(storage_path, pdf_bytes, "application/pdf")

    consent = PatientConsent(
        id=consent_id,
        clinic_id=current_user.clinic_id,
        patient_id=body.patient_id,
        template_id=body.template_id,
        medical_record_id=body.medical_record_id,
        signed_by=current_user.id,
        pdf_path=storage_path,
        signed_at=now,
    )
    db.add(consent)
    await db.flush()

    signed_url = await storage.get_signed_url(storage_path)
    return PatientConsentOut(
        id=consent.id,
        clinic_id=consent.clinic_id,
        patient_id=consent.patient_id,
        template_id=consent.template_id,
        medical_record_id=consent.medical_record_id,
        signed_by=consent.signed_by,
        pdf_url=signed_url,
        signed_at=consent.signed_at,
        template_title=template.title,
    )
