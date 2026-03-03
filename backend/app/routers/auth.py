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
from app.schemas import UserOut, ClinicOut, ClinicPublic
from pydantic import BaseModel, EmailStr


router = APIRouter(prefix="/api/auth", tags=["Auth"])


def _generate_access_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class OnboardingRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: Literal["admin_clinic", "doctor", "receptionist"] = "admin_clinic"
    clinic_name: str | None = None     # requerido si role == admin_clinic
    clinic_id: uuid.UUID | None = None # requerido si role != admin_clinic
    access_code: str | None = None     # requerido si role != admin_clinic


class MeResponse(BaseModel):
    user: UserOut
    clinic: ClinicOut


# ── Endpoint público: lista de clínicas para el dropdown de onboarding ──────
@router.get("/clinics", response_model=list[ClinicPublic])
async def list_clinics_public(db: Annotated[AsyncSession, Depends(get_db)]):
    """Devuelve id + nombre de todas las clínicas activas (sin autenticación)."""
    result = await db.execute(
        select(Clinic).where(Clinic.is_active == True).order_by(Clinic.name)
    )
    return result.scalars().all()


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
        if not body.clinic_id:
            raise HTTPException(status_code=422, detail="Seleccioná una clínica.")
        if not body.access_code:
            raise HTTPException(status_code=422, detail="Ingresá el código de acceso de la clínica.")

        result = await db.execute(
            select(Clinic).where(Clinic.id == body.clinic_id, Clinic.is_active == True)
        )
        clinic = result.scalar_one_or_none()
        if not clinic:
            raise HTTPException(status_code=404, detail="Clínica no encontrada.")
        if clinic.access_code != body.access_code.strip().upper():
            raise HTTPException(status_code=403, detail="Código de acceso incorrecto.")

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
    """Devuelve el perfil del usuario autenticado."""
    clerk_id = token_data.get("sub")
    result = await db.execute(select(User).where(User.clerk_id == clerk_id, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no registrado. Completa el onboarding.")

    clinic_result = await db.execute(select(Clinic).where(Clinic.id == user.clinic_id))
    clinic = clinic_result.scalar_one_or_none()

    return MeResponse(user=UserOut.model_validate(user), clinic=ClinicOut.model_validate(clinic))
