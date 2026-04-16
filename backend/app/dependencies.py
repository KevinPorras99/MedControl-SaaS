import time
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

# Cache en memoria con TTL de 1 hora para las JWKS de Clerk
_JWKS_TTL = 3600  # segundos
_jwks_cache: dict[str, tuple[dict, float]] = {}


async def _get_jwks(issuer: str) -> dict:
    cached = _jwks_cache.get(issuer)
    if cached:
        data, fetched_at = cached
        if time.monotonic() - fetched_at < _JWKS_TTL:
            return data

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(f"{issuer}/.well-known/jwks.json")
        resp.raise_for_status()

    jwks = resp.json()
    _jwks_cache[issuer] = (jwks, time.monotonic())
    return jwks


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


async def _get_email_from_clerk(clerk_id: str) -> str | None:
    """Consulta la API de Clerk para obtener el email principal del usuario."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"https://api.clerk.com/v1/users/{clerk_id}",
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
            )
            if resp.status_code != 200:
                return None
            data = resp.json()
            primary_id = data.get("primary_email_address_id")
            for ea in data.get("email_addresses", []):
                if ea["id"] == primary_id:
                    return ea["email_address"]
    except Exception:
        pass
    return None


async def get_current_user(
    token_data: Annotated[dict, Depends(verify_clerk_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Obtiene el usuario interno a partir del clerk_id del JWT.
    Si no se encuentra por clerk_id, intenta vincular un usuario pendiente por email."""
    clerk_id = token_data.get("sub")

    # 1. Búsqueda normal por clerk_id
    result = await db.execute(
        select(User).where(User.clerk_id == clerk_id, User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if user:
        return user

    # 2. Intentar auto-vincular un usuario pendiente creado por el admin
    email = await _get_email_from_clerk(clerk_id)
    if email:
        pending_result = await db.execute(
            select(User).where(
                User.clerk_id == f"pending:{email}",
                User.is_active == True,
            )
        )
        pending_user = pending_result.scalar_one_or_none()
        if pending_user:
            pending_user.clerk_id = clerk_id
            await db.flush()
            return pending_user

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Usuario no encontrado. Asegurate de completar el onboarding.",
    )


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
RequireClinical    = Depends(require_roles("admin_clinic", "doctor"))        # admin + doctor (sin recepcionista)
RequireAnyRole     = Depends(require_roles("admin_clinic", "doctor", "receptionist"))
RequireSuperAdmin  = Depends(require_roles("superadmin"))
