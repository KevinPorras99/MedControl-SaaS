import csv
import io
from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.patient import Patient

router = APIRouter(prefix="/api/reports", tags=["Reportes"])


@router.get("/financial", dependencies=[RequireAnyRole])
async def financial_summary(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: date | None = Query(None, description="Fecha inicial (YYYY-MM-DD)"),
    date_to: date | None = Query(None, description="Fecha final (YYYY-MM-DD)"),
):
    """Resumen financiero de la clínica con filtros opcionales de fecha."""
    clinic_id = current_user.clinic_id

    inv_filters = [Invoice.clinic_id == clinic_id]
    pay_filters = [Payment.clinic_id == clinic_id]

    if date_from:
        inv_filters.append(func.date(Invoice.issued_at) >= date_from)
        pay_filters.append(func.date(Payment.paid_at) >= date_from)
    if date_to:
        inv_filters.append(func.date(Invoice.issued_at) <= date_to)
        pay_filters.append(func.date(Payment.paid_at) <= date_to)

    # Total facturado
    total_billed_res = await db.execute(
        select(func.coalesce(func.sum(Invoice.total), 0)).where(*inv_filters)
    )
    total_billed = float(total_billed_res.scalar())

    # Total cobrado (suma de pagos)
    total_paid_res = await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(*pay_filters)
    )
    total_collected = float(total_paid_res.scalar())

    # Desglose por estado de factura
    status_res = await db.execute(
        select(
            Invoice.status,
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total), 0),
        )
        .where(*inv_filters)
        .group_by(Invoice.status)
    )

    # Ingresos mensuales (todos los meses con pagos)
    monthly_res = await db.execute(
        select(
            func.to_char(Payment.paid_at, "YYYY-MM").label("month"),
            func.coalesce(func.sum(Payment.amount), 0).label("total"),
        )
        .where(Payment.clinic_id == clinic_id)
        .group_by(func.to_char(Payment.paid_at, "YYYY-MM"))
        .order_by(func.to_char(Payment.paid_at, "YYYY-MM"))
        .limit(13)
    )

    # Top 5 pacientes por facturación total
    top_patients_res = await db.execute(
        select(
            Patient.full_name,
            func.count(Invoice.id).label("invoice_count"),
            func.coalesce(func.sum(Invoice.total), 0).label("total"),
        )
        .join(Patient, Invoice.patient_id == Patient.id)
        .where(*inv_filters)
        .group_by(Patient.id, Patient.full_name)
        .order_by(func.coalesce(func.sum(Invoice.total), 0).desc())
        .limit(5)
    )

    return {
        "total_billed": total_billed,
        "total_collected": total_collected,
        "total_pending": round(total_billed - total_collected, 2),
        "by_status": [
            {"status": row[0], "count": row[1], "total": float(row[2])}
            for row in status_res.all()
        ],
        "monthly_revenue": [
            {"month": row[0], "total": float(row[1])}
            for row in monthly_res.all()
        ],
        "top_patients": [
            {"name": row[0], "invoice_count": row[1], "total": float(row[2])}
            for row in top_patients_res.all()
        ],
    }


@router.get("/export/invoices", dependencies=[RequireAnyRole])
async def export_invoices_csv(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    status: str | None = Query(None),
):
    """Exporta facturas a un archivo CSV descargable."""
    filters = [Invoice.clinic_id == current_user.clinic_id]
    if date_from:
        filters.append(func.date(Invoice.issued_at) >= date_from)
    if date_to:
        filters.append(func.date(Invoice.issued_at) <= date_to)
    if status:
        filters.append(Invoice.status == status)

    result = await db.execute(
        select(Invoice, Patient.full_name)
        .join(Patient, Invoice.patient_id == Patient.id)
        .where(*filters)
        .order_by(Invoice.issued_at.desc())
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["# Factura", "Fecha", "Paciente", "Subtotal", "IVA", "Total", "Estado"])
    for invoice, patient_name in rows:
        writer.writerow([
            invoice.invoice_number,
            invoice.issued_at.strftime("%Y-%m-%d"),
            patient_name,
            f"{invoice.subtotal:.2f}",
            f"{invoice.tax:.2f}",
            f"{invoice.total:.2f}",
            invoice.status,
        ])

    output.seek(0)
    filename = f"facturas_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/export/payments", dependencies=[RequireAnyRole])
async def export_payments_csv(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
):
    """Exporta pagos a un archivo CSV descargable."""
    filters = [Payment.clinic_id == current_user.clinic_id]
    if date_from:
        filters.append(func.date(Payment.paid_at) >= date_from)
    if date_to:
        filters.append(func.date(Payment.paid_at) <= date_to)

    result = await db.execute(
        select(Payment, Patient.full_name, Invoice.invoice_number)
        .join(Patient, Payment.patient_id == Patient.id)
        .join(Invoice, Payment.invoice_id == Invoice.id)
        .where(*filters)
        .order_by(Payment.paid_at.desc())
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Fecha", "Paciente", "# Factura", "Monto", "Método de Pago", "Referencia"])
    for payment, patient_name, invoice_number in rows:
        writer.writerow([
            payment.paid_at.strftime("%Y-%m-%d"),
            patient_name,
            invoice_number,
            f"{payment.amount:.2f}",
            payment.payment_method,
            payment.reference or "",
        ])

    output.seek(0)
    filename = f"pagos_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
