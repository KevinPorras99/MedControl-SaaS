from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from jose import jwt, JWTError

from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer()

# Cache en memoria para no pedir las JWKS en cada request
_jwks_cache: dict = {}


async def _get_jwks(issuer: str) -> dict:
    if issuer not in _jwks_cache:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{issuer}/.well-known/jwks.json")
            resp.raise_for_status()
        _jwks_cache[issuer] = resp.json()
    return _jwks_cache[issuer]


async def verify_clerk_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
) -> dict:
    """Valida el JWT de Clerk localmente usando sus JWKS públicas."""
    token = credentials.credentials
    try:
        unverified = jwt.get_unverified_claims(token)
        issuer = unverified.get("iss", "")
        if not issuer:
            raise JWTError("Falta el campo 'iss' en el token")

        jwks = await _get_jwks(issuer)
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


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
