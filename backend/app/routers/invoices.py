import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import CurrentUser, RequireAnyRole, RequireClinical
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.inventory import InventoryItem, InventoryMovement
from app.schemas import InvoiceCreate, InvoiceOut, InvoiceUpdate, PaymentCreate, PaymentOut
from app.services.invoice_number import generate_invoice_number

router = APIRouter(prefix="/api/invoices", tags=["Facturación"])

# Tasa de IVA centralizada en el backend — el frontend nunca calcula impuestos
IVA_RATE = Decimal("0.13")


@router.get("", response_model=list[InvoiceOut], dependencies=[RequireAnyRole])
async def list_invoices(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    status: str | None = None,
    patient_id: uuid.UUID | None = None,
):
    q = select(Invoice).where(Invoice.clinic_id == current_user.clinic_id)
    if status:
        q = q.where(Invoice.status == status)
    if patient_id:
        q = q.where(Invoice.patient_id == patient_id)
    q = q.order_by(Invoice.issued_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireAnyRole])
async def create_invoice(
    body: InvoiceCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Toda la lógica financiera vive en el backend
    subtotal = sum(item.unit_price * item.quantity for item in body.items)
    tax = (subtotal * IVA_RATE).quantize(Decimal("0.01"))
    total = subtotal + tax

    # Validar stock de ítems vinculados al inventario antes de crear la factura
    inv_deductions: list[tuple[InventoryItem, int]] = []
    for item in body.items:
        if item.inventory_item_id is None:
            continue
        res = await db.execute(
            select(InventoryItem).where(
                InventoryItem.id == item.inventory_item_id,
                InventoryItem.clinic_id == current_user.clinic_id,
                InventoryItem.is_active == True,
            )
        )
        inv_item = res.scalar_one_or_none()
        if not inv_item:
            continue  # ítem eliminado o de otra clínica — se ignora silenciosamente
        if inv_item.stock < item.quantity:
            raise HTTPException(
                status_code=422,
                detail=f"Stock insuficiente para '{inv_item.name}' (disponible: {inv_item.stock}, solicitado: {item.quantity})",
            )
        inv_deductions.append((inv_item, item.quantity))

    invoice_number = await generate_invoice_number(current_user.clinic_id, db)
    invoice = Invoice(
        patient_id=body.patient_id,
        clinic_id=current_user.clinic_id,
        invoice_number=invoice_number,
        subtotal=subtotal,
        tax=tax,
        total=total,
        # Ítems serializados como JSON para poder reimprimir la factura
        notes=json.dumps([item.model_dump(mode="json") for item in body.items]),
    )
    db.add(invoice)
    await db.flush()

    # Descontar stock y registrar movimientos de salida
    now = datetime.now(timezone.utc)
    for inv_item, qty in inv_deductions:
        inv_item.stock -= qty
        inv_item.updated_at = now
        db.add(InventoryMovement(
            clinic_id=current_user.clinic_id,
            item_id=inv_item.id,
            user_id=current_user.id,
            type="salida",
            quantity=-qty,
            reason=f"Factura {invoice_number}",
        ))

    await db.refresh(invoice)
    return invoice


@router.patch("/{invoice_id}", response_model=InvoiceOut, dependencies=[RequireClinical])
async def update_invoice(
    invoice_id: uuid.UUID,
    body: InvoiceUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.clinic_id == current_user.clinic_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(invoice, field, value)
    await db.flush()
    await db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/pay", response_model=PaymentOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireAnyRole])
async def register_payment(
    invoice_id: uuid.UUID,
    body: PaymentCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.clinic_id == current_user.clinic_id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    if invoice.status == "anulada":
        raise HTTPException(status_code=400, detail="No se puede registrar un pago en una factura anulada")

    payment = Payment(
        **body.model_dump(),
        clinic_id=current_user.clinic_id,
        patient_id=invoice.patient_id,
        created_by=current_user.id,
    )
    db.add(payment)

    # Calcular total pagado y actualizar status
    paid_result = await db.execute(
        select(func.sum(Payment.amount)).where(Payment.invoice_id == invoice_id)
    )
    total_paid = (paid_result.scalar() or 0) + body.amount
    if total_paid >= invoice.total:
        invoice.status = "pagada"

    await db.flush()
    await db.refresh(payment)
    return payment
