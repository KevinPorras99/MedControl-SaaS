"""
Router exclusivo del superadmin de plataforma.
Permite gestionar todas las clínicas y crear nuevas con su admin inicial.
"""
import re
import uuid
import secrets
import string
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import httpx

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser, RequireSuperAdmin
from app.models.clinic import Clinic
from app.models.user import User

router = APIRouter(prefix="/api/superadmin", tags=["Superadmin"])


# ── Helpers ──────────────────────────────────────────────────────────────────

def _gen_access_code(length: int = 8) -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def _generate_username(email: str) -> str:
    local = email.split("@")[0]
    sanitized = re.sub(r"[^a-z0-9_]", "", local.lower())
    suffix = str(uuid.uuid4()).replace("-", "")[:6]
    return f"{sanitized}_{suffix}" if sanitized else f"user_{suffix}"


async def _create_clerk_user(full_name: str, email: str, password: str) -> str:
    parts = full_name.strip().split(" ", 1)
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://api.clerk.com/v1/users",
            headers={
                "Authorization": f"Bearer {settings.clerk_secret_key}",
                "Content-Type": "application/json",
            },
            json={
                "email_address": [email],
                "password": password,
                "first_name": parts[0],
                "last_name": parts[1] if len(parts) > 1 else "",
                "username": _generate_username(email),
            },
        )
    if resp.status_code in (200, 201):
        return resp.json()["id"]
    errors = resp.json().get("errors", [])
    msg = errors[0].get("long_message", "Error creando usuario en Clerk") if errors else "Error en Clerk"
    raise HTTPException(status_code=400, detail=msg)


def _clinic_out(clinic: Clinic, user_count: int = 0) -> dict:
    return {
        "id": str(clinic.id),
        "name": clinic.name,
        "legal_id": clinic.legal_id,
        "specialty": clinic.specialty,
        "email": clinic.email,
        "phone": clinic.phone,
        "address": clinic.address,
        "city": clinic.city,
        "province": clinic.province,
        "country": clinic.country,
        "subscription_plan": clinic.subscription_plan,
        "is_active": clinic.is_active,
        "access_code": clinic.access_code,
        "user_count": user_count,
        "created_at": clinic.created_at.isoformat(),
    }


# ── Listar todas las clínicas ─────────────────────────────────────────────────

@router.get("/clinics", dependencies=[RequireSuperAdmin])
async def list_all_clinics(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[dict]:
    clinics_result = await db.execute(
        select(Clinic).order_by(Clinic.created_at.desc())
    )
    clinics = clinics_result.scalars().all()

    # Contar usuarios por clínica en una sola query
    counts_result = await db.execute(
        select(User.clinic_id, func.count(User.id))
        .where(User.clinic_id.isnot(None), User.is_active == True)
        .group_by(User.clinic_id)
    )
    counts = {str(row[0]): row[1] for row in counts_result.all()}

    return [_clinic_out(c, counts.get(str(c.id), 0)) for c in clinics]


# ── Detalle de una clínica ────────────────────────────────────────────────────

@router.get("/clinics/{clinic_id}", dependencies=[RequireSuperAdmin])
async def get_clinic(
    clinic_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    users_result = await db.execute(
        select(User).where(User.clinic_id == clinic_id, User.is_active == True)
        .order_by(User.role, User.full_name)
    )
    users = users_result.scalars().all()

    data = _clinic_out(clinic, len(users))
    data["users"] = [
        {"id": str(u.id), "full_name": u.full_name, "email": u.email, "role": u.role, "is_active": u.is_active}
        for u in users
    ]
    return data


# ── Crear nueva clínica + admin ────────────────────────────────────────────────

@router.post("/clinics", status_code=status.HTTP_201_CREATED, dependencies=[RequireSuperAdmin])
async def create_clinic(
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    clinic_name  = (body.get("clinic_name") or "").strip()
    admin_name   = (body.get("admin_name") or "").strip()
    admin_email  = (body.get("admin_email") or "").strip().lower()
    admin_pass   = body.get("admin_password", "")
    plan         = body.get("subscription_plan", "basico")

    if not clinic_name:
        raise HTTPException(status_code=422, detail="El nombre de la clínica es requerido")
    if not admin_name:
        raise HTTPException(status_code=422, detail="El nombre del administrador es requerido")
    if not admin_email or "@" not in admin_email:
        raise HTTPException(status_code=422, detail="Email del administrador inválido")
    if len(admin_pass) < 8:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 8 caracteres")
    if plan not in ("basico", "profesional", "clinica"):
        raise HTTPException(status_code=422, detail="Plan inválido")

    # Verificar que el email no exista en otra clínica
    existing = await db.execute(select(User).where(User.email == admin_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email")

    # 1. Crear en Clerk
    clerk_id = await _create_clerk_user(admin_name, admin_email, admin_pass)

    # 2. Crear la clínica
    clinic = Clinic(
        name=clinic_name,
        subscription_plan=plan,
        access_code=_gen_access_code(),
        legal_id=body.get("legal_id"),
        specialty=body.get("specialty"),
        email=body.get("clinic_email"),
        phone=body.get("clinic_phone"),
        address=body.get("address"),
        city=body.get("city"),
        province=body.get("province"),
        country=body.get("country", "Costa Rica"),
    )
    db.add(clinic)
    await db.flush()  # obtener clinic.id

    # 3. Crear el admin de esa clínica
    admin = User(
        clerk_id=clerk_id,
        clinic_id=clinic.id,
        role="admin_clinic",
        full_name=admin_name,
        email=admin_email,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(clinic)

    return _clinic_out(clinic, 1)


# ── Actualizar clínica (plan, estado, datos) ──────────────────────────────────

@router.patch("/clinics/{clinic_id}", dependencies=[RequireSuperAdmin])
async def update_clinic(
    clinic_id: uuid.UUID,
    body: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    allowed = {
        "name", "subscription_plan", "is_active",
        "legal_id", "specialty", "email", "phone",
        "address", "city", "province", "country",
    }
    for k, v in body.items():
        if k in allowed:
            setattr(clinic, k, v)

    await db.commit()
    await db.refresh(clinic)
    return _clinic_out(clinic)


# ── Estadísticas globales ─────────────────────────────────────────────────────

@router.get("/stats", dependencies=[RequireSuperAdmin])
async def platform_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    total_clinics  = (await db.execute(select(func.count(Clinic.id)))).scalar() or 0
    active_clinics = (await db.execute(select(func.count(Clinic.id)).where(Clinic.is_active == True))).scalar() or 0
    total_users    = (await db.execute(select(func.count(User.id)).where(User.is_active == True, User.role != "superadmin"))).scalar() or 0

    plan_counts_result = await db.execute(
        select(Clinic.subscription_plan, func.count(Clinic.id))
        .where(Clinic.is_active == True)
        .group_by(Clinic.subscription_plan)
    )
    plans = {row[0]: row[1] for row in plan_counts_result.all()}

    return {
        "total_clinics": total_clinics,
        "active_clinics": active_clinics,
        "total_users": total_users,
        "plans": plans,
    }
