"""
Worker de recordatorios WhatsApp — implementado con asyncio puro.

Corre como una tarea de fondo dentro del event loop de FastAPI,
sin dependencias externas. Cada 5 minutos busca WhatsappLogs
pendientes cuya ventana de envío (appointment_date - 24 h) ya llegó.
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.appointment import Appointment
from app.models.whatsapp_log import WhatsappLog
from app.services.whatsapp import send_whatsapp_message

logger = logging.getLogger(__name__)

_INTERVAL_SECONDS = 300   # cada 5 minutos
_BATCH_SIZE       = 50    # máximo de logs por ciclo
_task: asyncio.Task | None = None


async def _send_pending_reminders() -> None:
    """
    Envía recordatorios pendientes cuyo momento de envío ya llegó.
    Condiciones:
      - WhatsappLog.status == "pendiente"
      - appointment_id presente
      - La cita aún está en el futuro
      - appointment_date - 24 h <= ahora (ventana abierta)
      - Estado de la cita: programada o confirmada
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=24)

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(
                select(WhatsappLog)
                .join(Appointment, WhatsappLog.appointment_id == Appointment.id)
                .where(
                    WhatsappLog.status == "pendiente",
                    WhatsappLog.appointment_id.isnot(None),
                    Appointment.appointment_date > now,
                    Appointment.appointment_date <= cutoff,
                    Appointment.status.in_(["programada", "confirmada"]),
                )
                .limit(_BATCH_SIZE)
            )
            logs: list[WhatsappLog] = result.scalars().all()

            if not logs:
                await session.commit()  # cierra la transacción limpiamente sin ROLLBACK
                return

            logger.info("[Scheduler] Procesando %d recordatorio(s)...", len(logs))

            for log in logs:
                try:
                    success = await send_whatsapp_message(log.phone_number, log.message_body)
                    if success:
                        log.status = "enviado"
                        log.sent_at = now
                    else:
                        log.status = "fallido"
                        log.error_detail = "La API de WhatsApp devolvió un error"
                except Exception as exc:
                    log.status = "fallido"
                    log.error_detail = str(exc)[:500]
                    logger.error("[Scheduler] Error en log %s: %s", log.id, exc)

            await session.commit()
            logger.info("[Scheduler] Ciclo completado.")

        except Exception as exc:
            await session.rollback()
            logger.error("[Scheduler] Error crítico: %s", exc)


async def _loop() -> None:
    """Bucle infinito que ejecuta el job cada _INTERVAL_SECONDS."""
    logger.info("[Scheduler] Iniciado — intervalo: %ds.", _INTERVAL_SECONDS)
    while True:
        await asyncio.sleep(_INTERVAL_SECONDS)
        try:
            await _send_pending_reminders()
        except Exception as exc:
            logger.error("[Scheduler] Excepción no controlada: %s", exc)


def start_scheduler() -> None:
    """Arranca el worker como tarea asyncio. Llamar desde el lifespan de FastAPI."""
    global _task
    _task = asyncio.create_task(_loop(), name="whatsapp_reminder_worker")


def stop_scheduler() -> None:
    """Cancela el worker. Llamar en el shutdown del lifespan."""
    global _task
    if _task and not _task.done():
        _task.cancel()
        logger.info("[Scheduler] Detenido.")
