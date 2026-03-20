"""
portal_auth.py — JWT independiente de Clerk para el portal del paciente.
Los tokens son de 30 días y no requieren Clerk.
"""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import jwt, JWTError

from app.config import settings

_ALGORITHM = "HS256"
_TOKEN_TYPE = "patient_portal"


def _secret() -> str:
    """Usa portal_secret_key si está configurada, sino deriva una del clerk_secret_key."""
    if settings.portal_secret_key:
        return settings.portal_secret_key
    # Fallback determinista para desarrollo sin configuración extra
    return f"portal_{settings.clerk_secret_key[:32]}"


def create_portal_token(patient_id: uuid.UUID, clinic_id: uuid.UUID) -> str:
    """Genera un JWT de 30 días para el acceso del paciente al portal."""
    payload = {
        "sub": str(patient_id),
        "clinic_id": str(clinic_id),
        "type": _TOKEN_TYPE,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _secret(), algorithm=_ALGORITHM)


def verify_portal_token(token: str) -> dict:
    """
    Valida el JWT del portal. Lanza HTTPException 401 si es inválido o expirado.
    Retorna el payload con 'sub' (patient_id) y 'clinic_id'.
    """
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
        if payload.get("type") != _TOKEN_TYPE:
            raise JWTError("Tipo de token incorrecto")
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token del portal inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
