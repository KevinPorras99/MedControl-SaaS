from __future__ import annotations
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, EmailStr, field_validator


# ── Clinic ────────────────────────────────────────
class ClinicOut(BaseModel):
    id: uuid.UUID
    name: str
    access_code: str | None
    subscription_plan: str
    is_active: bool
    email: str | None
    phone: str | None
    address: str | None

    model_config = {"from_attributes": True}


class ClinicUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None


# ── User ──────────────────────────────────────────
class UserOut(BaseModel):
    id: uuid.UUID
    clerk_id: str
    clinic_id: uuid.UUID
    role: str
    full_name: str
    email: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    clerk_id: str
    clinic_id: uuid.UUID
    role: Literal["admin_clinic", "doctor", "receptionist"]
    full_name: str
    email: EmailStr


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: Literal["admin_clinic", "doctor", "receptionist"] | None = None
    is_active: bool | None = None


# ── Patient ───────────────────────────────────────
class PatientCreate(BaseModel):
    full_name: str
    phone: str | None = None
    email: EmailStr | None = None
    birth_date: date | None = None
    gender: str | None = None
    address: str | None = None
    notes: str | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 200:
            raise ValueError("El nombre debe tener entre 2 y 200 caracteres")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v and len(v) > 50:
            raise ValueError("El teléfono no puede superar 50 caracteres")
        return v

    @field_validator("notes", "address")
    @classmethod
    def validate_text_fields(cls, v: str | None) -> str | None:
        if v and len(v) > 2000:
            raise ValueError("El campo no puede superar 2000 caracteres")
        return v


class PatientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    birth_date: date | None = None
    gender: str | None = None
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) < 2 or len(v) > 200:
                raise ValueError("El nombre debe tener entre 2 y 200 caracteres")
        return v


class PatientOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    full_name: str
    phone: str | None
    email: str | None
    birth_date: date | None
    gender: str | None
    address: str | None
    notes: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Appointment ───────────────────────────────────
class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: datetime
    duration_minutes: int = 30
    reason: str | None = None
    notes: str | None = None

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v < 5 or v > 480:
            raise ValueError("La duración debe estar entre 5 y 480 minutos")
        return v

    @field_validator("reason", "notes")
    @classmethod
    def validate_text(cls, v: str | None) -> str | None:
        if v and len(v) > 1000:
            raise ValueError("El campo no puede superar 1000 caracteres")
        return v


class AppointmentUpdate(BaseModel):
    appointment_date: datetime | None = None
    duration_minutes: int | None = None
    reason: str | None = None
    status: Literal["programada", "confirmada", "cancelada", "atendida"] | None = None
    notes: str | None = None

    @field_validator("duration_minutes")
    @classmethod
    def validate_duration(cls, v: int | None) -> int | None:
        if v is not None and (v < 5 or v > 480):
            raise ValueError("La duración debe estar entre 5 y 480 minutos")
        return v


class AppointmentOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_date: datetime
    duration_minutes: int
    reason: str | None
    status: str
    notes: str | None
    created_at: datetime
    updated_at: datetime
    # Campos enriquecidos desde JOIN – nunca calculados en frontend
    patient_name: str | None = None
    doctor_name: str | None = None

    model_config = {"from_attributes": True}


# ── Attachment ────────────────────────────────────
class AttachmentOut(BaseModel):
    id: uuid.UUID
    file_name: str
    file_url: str
    file_size_bytes: int | None
    mime_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Medical Record ────────────────────────────────
class MedicalRecordCreate(BaseModel):
    patient_id: uuid.UUID
    appointment_id: uuid.UUID | None = None
    diagnosis: str | None = None
    treatment: str | None = None
    notes: str | None = None
    prescription: str | None = None

    @field_validator("diagnosis", "treatment", "notes", "prescription")
    @classmethod
    def validate_clinical_text(cls, v: str | None) -> str | None:
        if v and len(v) > 5000:
            raise ValueError("El campo no puede superar 5000 caracteres")
        return v


class MedicalRecordOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    appointment_id: uuid.UUID | None
    diagnosis: str | None
    treatment: str | None
    notes: str | None
    prescription: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Follow-up Reminders ───────────────────────────────────────────────────────
class ReminderCreate(BaseModel):
    patient_id: uuid.UUID
    record_id: uuid.UUID | None = None
    due_date: date
    notes: str | None = None

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v: str | None) -> str | None:
        if v and len(v) > 1000:
            raise ValueError("Las notas no pueden superar 1000 caracteres")
        return v


class ReminderUpdate(BaseModel):
    status: Literal["pending", "sent", "cancelled"] | None = None
    notes: str | None = None


class ReminderOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    record_id: uuid.UUID | None
    doctor_id: uuid.UUID
    due_date: date
    notes: str | None
    status: str
    created_at: datetime
    patient_name: str | None = None
    doctor_name: str | None = None

    model_config = {"from_attributes": True}


# ── Invoice ───────────────────────────────────────
class InvoiceItemIn(BaseModel):
    """Un ítem de factura tal como llega del frontend."""
    description: str
    quantity: int = 1
    unit_price: Decimal

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 500:
            raise ValueError("La descripción debe tener entre 1 y 500 caracteres")
        return v

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 1 or v > 9999:
            raise ValueError("La cantidad debe estar entre 1 y 9999")
        return v

    @field_validator("unit_price")
    @classmethod
    def validate_price(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("El precio no puede ser negativo")
        if v > Decimal("9999999.99"):
            raise ValueError("El precio excede el límite permitido")
        return v


class InvoiceCreate(BaseModel):
    """El frontend solo envía paciente e ítems; el backend calcula todos los montos."""
    patient_id: uuid.UUID
    items: list[InvoiceItemIn]

    @field_validator("items")
    @classmethod
    def validate_items(cls, v: list) -> list:
        if not v:
            raise ValueError("La factura debe tener al menos un ítem")
        if len(v) > 50:
            raise ValueError("La factura no puede tener más de 50 ítems")
        return v


class InvoiceUpdate(BaseModel):
    status: Literal["pendiente", "pagada", "anulada"] | None = None
    notes: str | None = None


class InvoiceOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    invoice_number: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    status: str
    notes: str | None
    issued_at: datetime

    model_config = {"from_attributes": True}


# ── Payment ───────────────────────────────────────
class PaymentCreate(BaseModel):
    invoice_id: uuid.UUID
    amount: Decimal
    payment_method: Literal["efectivo", "tarjeta", "transferencia"] = "efectivo"
    reference: str | None = None
    notes: str | None = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El monto del pago debe ser mayor a cero")
        if v > Decimal("9999999.99"):
            raise ValueError("El monto excede el límite permitido")
        return v

    @field_validator("reference", "notes")
    @classmethod
    def validate_text(cls, v: str | None) -> str | None:
        if v and len(v) > 500:
            raise ValueError("El campo no puede superar 500 caracteres")
        return v


class PaymentOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    invoice_id: uuid.UUID
    patient_id: uuid.UUID
    amount: Decimal
    payment_method: str
    reference: str | None
    notes: str | None
    paid_at: datetime

    model_config = {"from_attributes": True}


# ── Consent Templates ──────────────────────────────────────────────────────────
class ConsentTemplateCreate(BaseModel):
    title: str
    content: str

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 255:
            raise ValueError("El título debe tener entre 2 y 255 caracteres")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("El contenido no puede estar vacío")
        if len(v) > 20000:
            raise ValueError("El contenido no puede superar 20,000 caracteres")
        return v


class ConsentTemplateUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    is_active: bool | None = None


class ConsentTemplateOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    title: str
    content: str
    is_active: bool
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Patient Consents ───────────────────────────────────────────────────────────
class PatientConsentCreate(BaseModel):
    patient_id: uuid.UUID
    template_id: uuid.UUID
    medical_record_id: uuid.UUID | None = None
    signature_data_url: str

    @field_validator("signature_data_url")
    @classmethod
    def validate_signature(cls, v: str) -> str:
        if not v.startswith("data:image/png;base64,"):
            raise ValueError("La firma debe ser una imagen PNG en base64")
        if len(v) > 400_000:
            raise ValueError("La imagen de firma es demasiado grande")
        return v


class PatientConsentOut(BaseModel):
    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    template_id: uuid.UUID
    medical_record_id: uuid.UUID | None
    signed_by: uuid.UUID
    pdf_url: str
    signed_at: datetime
    template_title: str | None = None

    model_config = {"from_attributes": True}
