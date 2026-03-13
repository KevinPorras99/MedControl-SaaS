from datetime import date, datetime
from typing import Annotated
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, union_all, literal, func

from app.database import get_db
from app.dependencies import CurrentUser, RequireAdmin
from app.models.appointment import Appointment
from app.models.invoice import Invoice
from app.models.patient import Patient
from app.models.medical_record import MedicalRecord
from app.models.user import User

router = APIRouter(prefix="/api/audit", tags=["Auditoría"])


@router.get("", dependencies=[RequireAdmin])
async def get_audit_logs(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    limit: int = Query(100, le=500),
):
    """Retorna un log de auditoría combinado de las acciones del sistema."""
    clinic_id = current_user.clinic_id
    logs = []

    # Pacientes creados recientemente
    q_patients = select(
        Patient.id,
        Patient.full_name.label("description"),
        Patient.created_at,
        literal("Paciente registrado").label("action"),
        literal("Pacientes").label("module"),
    ).where(Patient.clinic_id == clinic_id)
    if date_from:
        q_patients = q_patients.where(func.date(Patient.created_at) >= date_from)
    if date_to:
        q_patients = q_patients.where(func.date(Patient.created_at) <= date_to)

    res_p = await db.execute(q_patients.order_by(Patient.created_at.desc()).limit(limit))
    for row in res_p.all():
        logs.append({
            "id": str(row.id),
            "action": row.action,
            "module": row.module,
            "description": f"Paciente creado: {row.description}",
            "created_at": row.created_at.isoformat(),
        })

    # Citas creadas
    q_appts = select(
        Appointment.id,
        Appointment.status.label("description"),
        Appointment.created_at,
        literal("Cita registrada").label("action"),
        literal("Agenda").label("module"),
    ).where(Appointment.clinic_id == clinic_id)
    if date_from:
        q_appts = q_appts.where(func.date(Appointment.created_at) >= date_from)
    if date_to:
        q_appts = q_appts.where(func.date(Appointment.created_at) <= date_to)

    res_a = await db.execute(q_appts.order_by(Appointment.created_at.desc()).limit(limit))
    for row in res_a.all():
        logs.append({
            "id": str(row.id),
            "action": row.action,
            "module": row.module,
            "description": f"Cita en estado: {row.description}",
            "created_at": row.created_at.isoformat(),
        })

    # Facturas creadas
    q_inv = select(
        Invoice.id,
        Invoice.invoice_number.label("description"),
        Invoice.issued_at.label("created_at"),
        literal("Factura emitida").label("action"),
        literal("Facturación").label("module"),
    ).where(Invoice.clinic_id == clinic_id)

    res_i = await db.execute(q_inv.order_by(Invoice.issued_at.desc()).limit(limit))
    for row in res_i.all():
        logs.append({
            "id": str(row.id),
            "action": row.action,
            "module": row.module,
            "description": f"Factura {row.description} emitida",
            "created_at": row.created_at.isoformat(),
        })

    # Usuarios del equipo
    q_users = select(
        User.id,
        User.full_name.label("description"),
        User.created_at,
        literal("Usuario creado").label("action"),
        literal("Usuarios").label("module"),
    ).where(User.clinic_id == clinic_id)

    res_u = await db.execute(q_users.order_by(User.created_at.desc()).limit(50))
    for row in res_u.all():
        logs.append({
            "id": str(row.id),
            "action": row.action,
            "module": row.module,
            "description": f"Usuario creado: {row.description}",
            "created_at": row.created_at.isoformat(),
        })

    # Sort by created_at desc and limit
    logs.sort(key=lambda x: x["created_at"], reverse=True)
    return logs[:limit]
