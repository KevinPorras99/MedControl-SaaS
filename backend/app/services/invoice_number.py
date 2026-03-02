import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.invoice import Invoice


async def generate_invoice_number(clinic_id: uuid.UUID, db: AsyncSession) -> str:
    """Genera un número de factura correlativo por clínica. Ej: FAC-000123"""
    result = await db.execute(
        select(func.count(Invoice.id)).where(Invoice.clinic_id == clinic_id)
    )
    count = (result.scalar() or 0) + 1
    return f"FAC-{str(count).zfill(6)}"
