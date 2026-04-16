import csv
import io
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import CurrentUser, RequireClinical, RequireAdmin
from app.models.inventory import InventoryItem, InventoryMovement

router = APIRouter(prefix="/api/inventory", tags=["Inventario"])


# ── Schemas (inline para mantener el archivo autocontenido) ─────────────────

def _item_out(item: InventoryItem) -> dict:
    return {
        "id": str(item.id),
        "name": item.name,
        "category": item.category,
        "unit": item.unit,
        "sku": item.sku,
        "stock": item.stock,
        "min_stock": item.min_stock,
        "cost_price": float(item.cost_price) if item.cost_price is not None else None,
        "supplier": item.supplier,
        "notes": item.notes,
        "is_active": item.is_active,
        "is_low_stock": item.stock <= item.min_stock,
        "created_at": item.created_at.isoformat(),
        "updated_at": item.updated_at.isoformat(),
    }


def _movement_out(mv: InventoryMovement) -> dict:
    return {
        "id": str(mv.id),
        "item_id": str(mv.item_id),
        "type": mv.type,
        "quantity": mv.quantity,
        "reason": mv.reason,
        "user_name": mv.user.full_name if mv.user else None,
        "created_at": mv.created_at.isoformat(),
    }


# ── Item CRUD ────────────────────────────────────────────────────────────────

@router.get("", dependencies=[RequireClinical])
async def list_items(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    search: str | None = Query(None),
    category: str | None = Query(None),
    low_stock: bool = Query(False),
    include_inactive: bool = Query(False),
) -> list[dict]:
    filters = [InventoryItem.clinic_id == current_user.clinic_id]
    if not include_inactive:
        filters.append(InventoryItem.is_active == True)
    if category:
        filters.append(InventoryItem.category == category)

    result = await db.execute(
        select(InventoryItem)
        .where(*filters)
        .order_by(InventoryItem.category.asc(), InventoryItem.name.asc())
    )
    items = result.scalars().all()

    if search:
        q = search.lower()
        items = [i for i in items if q in i.name.lower() or (i.sku and q in i.sku.lower())]

    if low_stock:
        items = [i for i in items if i.stock <= i.min_stock]

    return [_item_out(i) for i in items]


@router.post("", dependencies=[RequireClinical])
async def create_item(
    body: dict,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    item = InventoryItem(
        clinic_id  = current_user.clinic_id,
        name       = body["name"],
        category   = body.get("category", "otros"),
        unit       = body.get("unit", "unidad"),
        sku        = body.get("sku"),
        stock      = body.get("stock", 0),
        min_stock  = body.get("min_stock", 5),
        cost_price = body.get("cost_price"),
        supplier   = body.get("supplier"),
        notes      = body.get("notes"),
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return _item_out(item)


@router.post("/import", dependencies=[RequireClinical])
async def import_inventory_csv(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(...),
) -> dict:
    """Importa ítems de inventario desde un archivo CSV."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    results: dict = {"imported": 0, "skipped": 0, "errors": []}

    for i, row in enumerate(reader, start=2):
        name = (row.get("nombre") or "").strip()
        if not name:
            results["errors"].append({"row": i, "error": "Columna 'nombre' requerida"})
            results["skipped"] += 1
            continue

        try:
            stock     = max(0, int(float(row.get("stock_inicial") or 0)))
            min_stock = max(0, int(float(row.get("stock_minimo") or 5)))
            raw_price = (row.get("precio_costo") or "").strip()
            cost_price = Decimal(raw_price) if raw_price else None
        except (ValueError, InvalidOperation):
            results["errors"].append({"row": i, "error": f"Valores numéricos inválidos en '{name}'"})
            results["skipped"] += 1
            continue

        db.add(InventoryItem(
            clinic_id  = current_user.clinic_id,
            name       = name,
            category   = (row.get("categoria") or "otros").strip() or "otros",
            unit       = (row.get("unidad") or "unidad").strip() or "unidad",
            sku        = (row.get("sku") or "").strip() or None,
            stock      = stock,
            min_stock  = min_stock,
            cost_price = cost_price,
            supplier   = (row.get("proveedor") or "").strip() or None,
            notes      = (row.get("notas") or "").strip() or None,
        ))
        results["imported"] += 1

    if results["imported"] > 0:
        await db.flush()

    return results


@router.patch("/{item_id}", dependencies=[RequireClinical])
async def update_item(
    item_id: UUID,
    body: dict,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.clinic_id == current_user.clinic_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")

    allowed = {"name", "category", "unit", "sku", "min_stock", "cost_price", "supplier", "notes", "is_active"}
    for key, value in body.items():
        if key in allowed:
            setattr(item, key, value)
    item.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(item)
    return _item_out(item)


@router.delete("/{item_id}", dependencies=[RequireAdmin])
async def delete_item(
    item_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.clinic_id == current_user.clinic_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    item.is_active = False
    item.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


# ── Movements ────────────────────────────────────────────────────────────────

@router.post("/{item_id}/movements", dependencies=[RequireClinical])
async def register_movement(
    item_id: UUID,
    body: dict,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.clinic_id == current_user.clinic_id,
            InventoryItem.is_active == True,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")

    mov_type = body.get("type")
    if mov_type not in ("entrada", "salida", "ajuste"):
        raise HTTPException(status_code=422, detail="Tipo debe ser: entrada, salida o ajuste")

    qty = int(body.get("quantity", 0))
    if qty <= 0:
        raise HTTPException(status_code=422, detail="La cantidad debe ser mayor a 0")

    # Determine delta
    delta = qty if mov_type == "entrada" else -qty
    new_stock = item.stock + delta
    if new_stock < 0:
        raise HTTPException(status_code=422, detail=f"Stock insuficiente (actual: {item.stock})")

    mv = InventoryMovement(
        clinic_id = current_user.clinic_id,
        item_id   = item_id,
        user_id   = current_user.id,
        type      = mov_type,
        quantity  = delta,
        reason    = body.get("reason"),
    )
    db.add(mv)
    item.stock = new_stock
    item.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(item)

    return {"item": _item_out(item)}


@router.get("/{item_id}/movements", dependencies=[RequireClinical])
async def list_movements(
    item_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(50, le=200),
) -> list[dict]:
    # Verify ownership
    exists = await db.execute(
        select(InventoryItem.id).where(
            InventoryItem.id == item_id,
            InventoryItem.clinic_id == current_user.clinic_id,
        )
    )
    if not exists.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Ítem no encontrado")

    result = await db.execute(
        select(InventoryMovement)
        .where(InventoryMovement.item_id == item_id)
        .options(selectinload(InventoryMovement.user))
        .order_by(InventoryMovement.created_at.desc())
        .limit(limit)
    )
    movements = result.scalars().all()
    return [_movement_out(mv) for mv in movements]


# ── Summary stats ─────────────────────────────────────────────────────────────

@router.get("/stats/summary", dependencies=[RequireClinical])
async def inventory_summary(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.clinic_id == current_user.clinic_id,
            InventoryItem.is_active == True,
        )
    )
    items = result.scalars().all()

    total = len(items)
    low = [i for i in items if 0 < i.stock <= i.min_stock]
    critical = [i for i in items if i.stock == 0]
    total_value = sum(
        float(i.cost_price) * i.stock for i in items if i.cost_price is not None
    )

    return {
        "total_items": total,
        "low_stock_count": len(low),
        "critical_count": len(critical),
        "total_value": round(total_value, 2),
    }
