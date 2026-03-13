import re
import uuid
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr, field_validator
import httpx

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser, RequireAdmin
from app.models.user import User
from app.models.clinic import Clinic
from app.schemas import UserOut, ClinicOut, ClinicUpdate, UserUpdate

router = APIRouter(prefix="/api/settings", tags=["Configuración"])


class CreateTeamMemberRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: Literal["doctor", "receptionist"]
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v


def _generate_username(email: str) -> str:
    local = email.split("@")[0]
    sanitized = re.sub(r"[^a-z0-9_]", "", local.lower())
    suffix = str(uuid.uuid4()).replace("-", "")[:6]
    return f"{sanitized}_{suffix}" if sanitized else f"user_{suffix}"


async def _create_clerk_user(full_name: str, email: str, password: str) -> str:
    """Crea un usuario en Clerk y devuelve su clerk_id. Lanza HTTPException si falla."""
    parts = full_name.strip().split(" ", 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ""
    username = _generate_username(email)

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
                "first_name": first_name,
                "last_name": last_name,
                "username": username,
            },
        )

    if resp.status_code == 200 or resp.status_code == 201:
        return resp.json()["id"]

    # Manejar errores de Clerk
    data = resp.json()
    errors = data.get("errors", [])
    if errors:
        code = errors[0].get("code", "")
        msg = errors[0].get("long_message") or errors[0].get("message", "Error desconocido")

        if code == "form_identifier_exists":
            raise HTTPException(status_code=409, detail="Ya existe una cuenta de Clerk con ese email.")
        if code == "form_password_pwned":
            raise HTTPException(status_code=400, detail="La contraseña es muy común. Elegí una más segura.")
        if "password" in code:
            raise HTTPException(status_code=400, detail=f"Contraseña inválida: {msg}")

        raise HTTPException(status_code=400, detail=msg)

    raise HTTPException(status_code=500, detail="Error al crear el usuario en Clerk.")


# ── GET equipo de la clínica ──────────────────────────────────────────────────
@router.get("/users", response_model=list[UserOut], dependencies=[RequireAdmin])
async def list_team(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    role: str | None = None,
):
    q = (
        select(User)
        .where(User.clinic_id == current_user.clinic_id, User.is_active == True)
    )
    if role:
        q = q.where(User.role == role)
    q = q.order_by(User.full_name)
    result = await db.execute(q)
    return result.scalars().all()


# ── POST crear miembro del equipo (solo admin) ────────────────────────────────
@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[RequireAdmin])
async def create_team_member(
    body: CreateTeamMemberRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    # Verificar que no exista ya en la clínica
    existing = await db.execute(
        select(User).where(User.email == body.email, User.clinic_id == current_user.clinic_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un usuario con ese email en esta clínica.")

    # Crear en Clerk primero para obtener el clerk_id real
    clerk_id = await _create_clerk_user(body.full_name, body.email, body.password)

    member = User(
        clerk_id=clerk_id,
        clinic_id=current_user.clinic_id,
        role=body.role,
        full_name=body.full_name,
        email=body.email,
    )
    db.add(member)
    await db.flush()
    await db.refresh(member)
    return member


# ── DELETE desactivar miembro (solo admin) ────────────────────────────────────
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[RequireAdmin])
async def remove_team_member(
    user_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No podés desactivar tu propia cuenta.")

    result = await db.execute(
        select(User).where(User.id == user_id, User.clinic_id == current_user.clinic_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    member.is_active = False


# ── GET datos de la clínica ───────────────────────────────────────────────────
@router.get("/clinic", response_model=ClinicOut, dependencies=[RequireAdmin])
async def get_clinic_settings(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Clinic).where(Clinic.id == current_user.clinic_id)
    )
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada.")
    return clinic


# ── PATCH actualizar datos de la clínica ──────────────────────────────────────
@router.patch("/clinic", response_model=ClinicOut, dependencies=[RequireAdmin])
async def update_clinic_settings(
    body: ClinicUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(Clinic).where(Clinic.id == current_user.clinic_id)
    )
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(clinic, field, value)
    await db.flush()
    await db.refresh(clinic)
    return clinic


# ── PATCH actualizar rol o estado de usuario ──────────────────────────────────
@router.patch("/users/{user_id}", response_model=UserOut, dependencies=[RequireAdmin])
async def update_team_member(
    user_id: uuid.UUID,
    body: UserUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No podés modificar tu propia cuenta.")
    result = await db.execute(
        select(User).where(User.id == user_id, User.clinic_id == current_user.clinic_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(member, field, value)
    await db.flush()
    await db.refresh(member)
    return member
