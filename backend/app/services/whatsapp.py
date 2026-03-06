import logging
import re
import httpx
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.whatsapp_log import WhatsappLog

logger = logging.getLogger(__name__)

_WA_API_VERSION = "v21.0"


def _normalize_phone(phone: str) -> str:
    """
    Convierte el número al formato internacional que requiere WhatsApp Cloud API.
    Ejemplos:
      +54 9 11 1234-5678  →  5491112345678
      0011549111234567    →  549111234567
      549111234567        →  549111234567
    """
    # Quita todo lo que no sea dígito
    digits = re.sub(r"\D", "", phone)
    # Elimina prefijos comunes de marcación internacional (00, 011)
    if digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("011"):
        digits = digits[3:]
    return digits


async def send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Envía un mensaje de texto por WhatsApp Cloud API.
    Si las credenciales no están configuradas, simula el envío en consola (modo dev).
    Retorna True si el mensaje fue aceptado por la API, False en caso contrario.
    """
    if not settings.whatsapp_token or not settings.whatsapp_phone_number_id:
        logger.info("[WhatsApp SIMULADO] → %s: %s", phone, message)
        return True

    normalized = _normalize_phone(phone)
    if not normalized:
        logger.warning("[WhatsApp] Número de teléfono inválido: %s", phone)
        return False

    url = f"https://graph.facebook.com/{_WA_API_VERSION}/{settings.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": normalized,
        "type": "text",
        "text": {"preview_url": False, "body": message},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.whatsapp_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if resp.status_code == 200:
            logger.info("[WhatsApp] Mensaje enviado a %s", normalized)
            return True

        # Loguea el error de Meta para facilitar el debug
        try:
            error_data = resp.json()
            error_msg = error_data.get("error", {}).get("message", resp.text)
        except Exception:
            error_msg = resp.text

        logger.error(
            "[WhatsApp] Error %s al enviar a %s: %s",
            resp.status_code, normalized, error_msg,
        )
        return False

    except httpx.TimeoutException:
        logger.error("[WhatsApp] Timeout al enviar a %s", normalized)
        return False
    except Exception as exc:
        logger.error("[WhatsApp] Excepción al enviar a %s: %s", normalized, exc)
        return False


async def schedule_reminder(appointment, db: AsyncSession):
    """Crea un log de recordatorio pendiente para la cita."""
    from sqlalchemy import select
    from app.models.patient import Patient

    # Carga explícita para evitar lazy loading en sesión async
    result = await db.execute(select(Patient).where(Patient.id == appointment.patient_id))
    patient = result.scalar_one_or_none()

    if not patient or not patient.phone:
        return

    reminder_time = appointment.appointment_date - timedelta(hours=24)
    if reminder_time < datetime.now(timezone.utc):
        return  # La cita es en menos de 24h, no hay tiempo para recordatorio

    message = (
        f"Hola! Te recordamos que tienes una cita médica programada para el "
        f"{appointment.appointment_date.strftime('%d/%m/%Y a las %H:%M')}. "
        f"Si necesitás cancelar o reagendar, contactanos."
    )

    log = WhatsappLog(
        clinic_id=appointment.clinic_id,
        patient_id=appointment.patient_id,
        appointment_id=appointment.id,
        phone_number=patient.phone,
        message_body=message,
        status="pendiente",
    )
    db.add(log)
