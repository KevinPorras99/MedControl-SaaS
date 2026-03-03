import asyncio
import uuid as _uuid
from supabase import create_client, Client
from app.config import settings

BUCKET = "medcontrol-files"
_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client


async def ensure_bucket() -> None:
    def _run():
        sb = _get_client()
        try:
            sb.storage.create_bucket(BUCKET, options={"public": False})
        except Exception:
            pass  # ya existe o no tiene permisos para crearlo

    await asyncio.to_thread(_run)


async def upload_file(path: str, data: bytes, content_type: str) -> None:
    def _run():
        res = _get_client().storage.from_(BUCKET).upload(
            path=path,
            file=data,
            file_options={"content-type": content_type},
        )
        # supabase-py v2 puede devolver un objeto con error en vez de lanzar excepción
        if hasattr(res, "error") and res.error:
            raise RuntimeError(f"Error al subir archivo: {res.error}")

    await asyncio.to_thread(_run)


async def get_signed_url(path: str, expires_in: int = 3600) -> str:
    """Genera una URL firmada válida por `expires_in` segundos (por defecto 1 hora)."""
    def _run():
        result = _get_client().storage.from_(BUCKET).create_signed_url(path, expires_in)
        # supabase-py v2 devuelve un dict con "signedURL"
        if isinstance(result, dict):
            return result.get("signedURL") or result.get("signed_url", "")
        return getattr(result, "signed_url", "") or getattr(result, "signedURL", "")

    return await asyncio.to_thread(_run)


async def delete_file(path: str) -> None:
    def _run():
        _get_client().storage.from_(BUCKET).remove([path])

    await asyncio.to_thread(_run)


def build_storage_path(clinic_id, record_id, filename: str) -> str:
    """Genera la ruta única en el bucket: clinic/record/uuid.ext"""
    ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
    unique = str(_uuid.uuid4())
    name = f"{unique}.{ext}" if ext else unique
    return f"{clinic_id}/{record_id}/{name}"
