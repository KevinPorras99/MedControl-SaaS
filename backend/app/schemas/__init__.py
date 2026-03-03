from __future__ import annotations
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, EmailStr


# ── Clinic ────────────────────────────────────────
class ClinicPublic(BaseModel):
    """Solo id + nombre — se expone sin autenticación para el dropdown de onboarding."""
    id: uuid.UUID
    name: str

    model_config = {"from_attributes": True}


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


class PatientUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    email: EmailStr | None = None
    birth_date: date | None = None
    gender: str | None = None
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None


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


class AppointmentUpdate(BaseModel):
    appointment_date: datetime | None = None
    duration_minutes: int | None = None
    reason: str | None = None
    status: Literal["programada", "confirmada", "cancelada", "atendida"] | None = None
    notes: str | None = None


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

    model_config = {"from_attributes": True}


# ── Medical Record ────────────────────────────────
class MedicalRecordCreate(BaseModel):
    patient_id: uuid.UUID
    appointment_id: uuid.UUID | None = None
    diagnosis: str | None = None
    treatment: str | None = None
    notes: str | None = None
    prescription: str | None = None


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


# ── Invoice ───────────────────────────────────────
class InvoiceCreate(BaseModel):
    patient_id: uuid.UUID
    subtotal: Decimal
    tax: Decimal = Decimal("0")
    notes: str | None = None


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
