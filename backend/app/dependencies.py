from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer()


async def verify_clerk_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    """Valida el JWT de Clerk y devuelve el payload."""
    token = credentials.credentials
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.clerk.com/v1/tokens/verify",
            headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            params={"token": token},
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )
    return resp.json()


async def get_current_user(
    token_data: Annotated[dict, Depends(verify_clerk_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Obtiene el usuario interno a partir del clerk_id del JWT."""
    clerk_id = token_data.get("sub")
    result = await db.execute(
        select(User).where(User.clerk_id == clerk_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado. Asegurate de completar el onboarding.",
        )
    return user


# ── Tipo reutilizable ──────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Guards por rol ─────────────────────────────────
def require_roles(*roles: str):
    """Factory que devuelve una dependencia que valida el rol del usuario."""
    async def _check(current_user: CurrentUser):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Roles permitidos: {', '.join(roles)}",
            )
        return current_user
    return _check


RequireAdmin       = Depends(require_roles("admin_clinic"))
RequireDoctor      = Depends(require_roles("doctor"))
RequireReception   = Depends(require_roles("admin_clinic", "receptionist"))
RequireAnyRole     = Depends(require_roles("admin_clinic", "doctor", "receptionist"))
