from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole
from app.models.appointment import Appointment
from app.models.invoice import Invoice
from app.models.inventory import InventoryItem

router = APIRouter(prefix="/api/notifications", tags=["Notificaciones"])

_SEV_ORDER = {"high": 0, "medium": 1, "low": 2}


@router.get("", dependencies=[RequireAnyRole])
async def get_notifications(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    """Devuelve las notificaciones activas para el usuario autenticado."""
    clinic_id = current_user.clinic_id
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    two_hours_later = now + timedelta(hours=2)

    notifications: list[dict] = []

    # ── Citas ─────────────────────────────────────────────────────────────────
    appt_filters = [
        Appointment.clinic_id == clinic_id,
        Appointment.status.in_(["programada", "confirmada"]),
        Appointment.appointment_date >= now,
        Appointment.appointment_date < today_end,
    ]

    # Doctors only see their own appointments
    if current_user.role == "doctor":
        appt_filters.append(Appointment.doctor_id == current_user.id)

    appt_result = await db.execute(
        select(Appointment)
        .where(*appt_filters)
        .options(selectinload(Appointment.patient))
        .order_by(Appointment.appointment_date.asc())
    )
    appointments = appt_result.scalars().all()

    for appt in appointments:
        patient_name = appt.patient.full_name if appt.patient else "Paciente"
        time_str = appt.appointment_date.astimezone(timezone.utc).strftime("%H:%M")

        if appt.appointment_date <= two_hours_later:
            # appointment_soon — high severity
            notifications.append({
                "id": f"appt_soon_{appt.id}",
                "type": "appointment_soon",
                "severity": "high",
                "title": "Cita en breve",
                "body": f"{patient_name} a las {time_str}",
                "link": "/appointments",
            })
        else:
            # appointment_today — medium severity
            notifications.append({
                "id": f"appt_today_{appt.id}",
                "type": "appointment_today",
                "severity": "medium",
                "title": "Cita hoy",
                "body": f"{patient_name} a las {time_str}",
                "link": "/appointments",
            })

    # ── Facturas ───────────────────────────────────────────────────────────────
    overdue_threshold = now - timedelta(days=7)

    inv_result = await db.execute(
        select(Invoice).where(
            Invoice.clinic_id == clinic_id,
            Invoice.status == "pendiente",
        )
    )
    pending_invoices = inv_result.scalars().all()

    overdue = [inv for inv in pending_invoices if inv.issued_at < overdue_threshold]
    not_overdue = [inv for inv in pending_invoices if inv.issued_at >= overdue_threshold]

    if overdue:
        count = len(overdue)
        notifications.append({
            "id": "invoice_overdue_grouped",
            "type": "invoice_overdue",
            "severity": "high",
            "title": "Facturas vencidas",
            "body": f"{count} factura(s) con más de 7 días pendientes",
            "link": "/invoices",
        })

    if not_overdue:
        count = len(not_overdue)
        notifications.append({
            "id": "invoice_pending_grouped",
            "type": "invoice_pending",
            "severity": "low",
            "title": "Facturas pendientes",
            "body": f"{count} factura(s) esperando pago",
            "link": "/invoices",
        })

    # ── Inventario bajo stock ─────────────────────────────────────────────────
    inv_result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.clinic_id == clinic_id,
            InventoryItem.is_active == True,
            InventoryItem.stock <= InventoryItem.min_stock,
        )
    )
    low_items = inv_result.scalars().all()

    critical = [i for i in low_items if i.stock == 0]
    low = [i for i in low_items if i.stock > 0]

    if critical:
        notifications.append({
            "id": "inventory_critical_grouped",
            "type": "inventory_critical",
            "severity": "high",
            "title": "Sin stock",
            "body": f"{len(critical)} ítem(s) sin existencias",
            "link": "/inventory",
        })

    if low:
        notifications.append({
            "id": "inventory_low_grouped",
            "type": "inventory_low",
            "severity": "medium",
            "title": "Stock bajo",
            "body": f"{len(low)} ítem(s) por debajo del mínimo",
            "link": "/inventory",
        })

    # ── Sort: high → medium → low ─────────────────────────────────────────────
    notifications.sort(key=lambda n: _SEV_ORDER.get(n["severity"], 99))

    return notifications
