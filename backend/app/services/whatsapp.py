import httpx
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.whatsapp_log import WhatsappLog


async def send_whatsapp_message(phone: str, message: str) -> bool:
    """Envía un mensaje por WhatsApp Cloud API."""
    if not settings.whatsapp_token or not settings.whatsapp_phone_number_id:
        print(f"[WhatsApp - SIMULADO] → {phone}: {message}")
        return True

    url = f"https://graph.facebook.com/v19.0/{settings.whatsapp_phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
            json=payload,
        )
    return resp.status_code == 200


async def schedule_reminder(appointment, db: AsyncSession):
    """Crea un log de recordatorio pendiente para la cita."""
    if not appointment.patient or not appointment.patient.phone:
        return

    reminder_time = appointment.appointment_date - timedelta(hours=24)
    if reminder_time < datetime.utcnow():
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
        phone_number=appointment.patient.phone,
        message_body=message,
        status="pendiente",
    )
    db.add(log)
