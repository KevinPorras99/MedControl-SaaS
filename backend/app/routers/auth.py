import re
import uuid
import secrets
import string
from typing import Annotated, Literal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import verify_clerk_token
from app.models.clinic import Clinic
from app.models.user import User
from app.schemas import UserOut, ClinicOut
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import selectinload


router = APIRouter(prefix="/api/auth", tags=["Auth"])

_ACCESS_CODE_RE = re.compile(r'^[A-Z0-9]{6}$')


def _generate_access_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class OnboardingRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: Literal["admin_clinic", "doctor", "receptionist"] = "admin_clinic"
    clinic_name: str | None = None
    access_code: str | None = None  # requerido si role != admin_clinic

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2 or len(v) > 200:
            raise ValueError("El nombre debe tener entre 2 y 200 caracteres")
        return v

    @field_validator("clinic_name")
    @classmethod
    def validate_clinic_name(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2 or len(v) > 200:
            raise ValueError("El nombre de la clínica debe tener entre 2 y 200 caracteres")
        return v

    @field_validator("access_code")
    @classmethod
    def validate_access_code_format(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip().upper()
        if not _ACCESS_CODE_RE.match(v):
            raise ValueError("El código de acceso debe tener exactamente 6 caracteres alfanuméricos")
        return v


class MeResponse(BaseModel):
    user: UserOut
    clinic: ClinicOut


# ── Onboarding ───────────────────────────────────────────────────────────────
@router.post("/onboarding", response_model=MeResponse, status_code=status.HTTP_201_CREATED)
async def onboarding(
    body: OnboardingRequest,
    token_data: Annotated[dict, Depends(verify_clerk_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Registra al usuario autenticado en la base de datos la primera vez que accede."""
    clerk_id = token_data.get("sub")

    # Verificar que no exista ya
    existing = await db.execute(select(User).where(User.clerk_id == clerk_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="El usuario ya fue registrado.")

    # Resolver clínica según el rol
    if body.role == "admin_clinic":
        if not body.clinic_name:
            raise HTTPException(status_code=422, detail="Se requiere el nombre de la clínica.")

        # Generar código único (reintentar si hay colisión)
        for _ in range(5):
            code = _generate_access_code()
            collision = await db.execute(select(Clinic).where(Clinic.access_code == code))
            if not collision.scalar_one_or_none():
                break

        clinic = Clinic(name=body.clinic_name, access_code=code)
        db.add(clinic)
        await db.flush()

    else:
        # Doctor o recepcionista se unen a una clínica existente via código de acceso
        if not body.access_code:
            raise HTTPException(
                status_code=422,
                detail="Se requiere el código de acceso para unirse a una clínica.",
            )

        clinic_result = await db.execute(
            select(Clinic).where(
                Clinic.access_code == body.access_code.upper().strip(),
                Clinic.is_active == True,
            )
        )
        clinic = clinic_result.scalar_one_or_none()
        if not clinic:
            raise HTTPException(
                status_code=404,
                detail="Código de acceso inválido o clínica no encontrada.",
            )

    user = User(
        clerk_id=clerk_id,
        clinic_id=clinic.id,
        role=body.role,
        full_name=body.full_name,
        email=body.email,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    await db.refresh(clinic)

    return MeResponse(user=UserOut.model_validate(user), clinic=ClinicOut.model_validate(clinic))


# ── Me ───────────────────────────────────────────────────────────────────────
@router.get("/me", response_model=MeResponse)
async def get_me(
    token_data: Annotated[dict, Depends(verify_clerk_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Devuelve el perfil del usuario autenticado (user + clinic en una sola query)."""
    clerk_id = token_data.get("sub")
    result = await db.execute(
        select(User)
        .options(selectinload(User.clinic))
        .where(User.clerk_id == clerk_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no registrado. Completa el onboarding.")

    return MeResponse(user=UserOut.model_validate(user), clinic=ClinicOut.model_validate(user.clinic))
