"""
email.py — Servicio de emails transaccionales via Resend.
Si RESEND_API_KEY no está configurada, simula el envío en consola (modo dev).
"""
import asyncio
import logging
from datetime import datetime

from app.config import settings

logger = logging.getLogger(__name__)


def _build_appointment_html(
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    appointment_date: datetime,
    duration_minutes: int,
    reason: str | None,
) -> str:
    date_str = appointment_date.strftime("%A, %d de %B de %Y").capitalize()
    time_str = appointment_date.strftime("%H:%M")
    reason_row = f"""
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:14px;">Motivo</td>
          <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">{reason}</td>
        </tr>
    """ if reason else ""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmación de cita</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d2d2d 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:#d97706;border-radius:12px;padding:8px 20px;margin-bottom:12px;">
                <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px;">MedControl</span>
              </div>
              <p style="color:#d1d5db;font-size:13px;margin:0;">{clinic_name}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">Hola,</p>
              <h1 style="color:#111827;font-size:22px;font-weight:700;margin:0 0 8px;">
                Tu cita ha sido confirmada
              </h1>
              <p style="color:#6b7280;font-size:14px;margin:0 0 28px;line-height:1.6;">
                Estimado/a <strong style="color:#111827;">{patient_name}</strong>, tu cita médica ha sido agendada exitosamente. A continuación encontrás los detalles:
              </p>

              <!-- Detalle card -->
              <table width="100%" cellpadding="0" cellspacing="0"
                style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
                <tr>
                  <td>
                    <!-- Fecha destacada -->
                    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 18px;margin-bottom:16px;text-align:center;">
                      <p style="color:#92400e;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:600;">Fecha y hora</p>
                      <p style="color:#78350f;font-size:20px;font-weight:700;margin:0;">{date_str}</p>
                      <p style="color:#d97706;font-size:28px;font-weight:800;margin:4px 0 0;">{time_str}</p>
                    </div>

                    <!-- Tabla de detalles -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">Médico</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">{doctor_name}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:14px;">Duración</td>
                        <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">{duration_minutes} minutos</td>
                      </tr>
                      {reason_row}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
                Si necesitás cancelar o reagendar tu cita, por favor contactanos con anticipación.
              </p>
              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
                ¡Te esperamos!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f3f4f6;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                Este correo fue enviado por <strong>{clinic_name}</strong> a través de MedControl.
                Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_appointment_confirmation(
    patient_email: str,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    appointment_date: datetime,
    duration_minutes: int,
    reason: str | None = None,
) -> bool:
    """
    Envía un email de confirmación de cita al paciente.
    Retorna True si se envió (o simuló) correctamente.
    Si RESEND_API_KEY no está configurada, loguea en consola sin fallar.
    """
    subject = f"Confirmación de cita — {appointment_date.strftime('%d/%m/%Y %H:%M')}"
    html = _build_appointment_html(
        patient_name=patient_name,
        doctor_name=doctor_name,
        clinic_name=clinic_name,
        appointment_date=appointment_date,
        duration_minutes=duration_minutes,
        reason=reason,
    )

    if not settings.resend_api_key:
        logger.info(
            "[Email SIMULADO] → %s | Asunto: %s",
            patient_email, subject,
        )
        return True

    def _send() -> bool:
        import resend
        resend.api_key = settings.resend_api_key
        try:
            resend.Emails.send({
                "from": settings.resend_email_from,
                "to": [patient_email],
                "subject": subject,
                "html": html,
            })
            logger.info("[Email] Confirmación enviada a %s", patient_email)
            return True
        except Exception as exc:
            logger.error("[Email] Error al enviar a %s: %s", patient_email, exc)
            return False

    return await asyncio.to_thread(_send)


async def send_follow_up_reminder(
    patient_email: str,
    patient_name: str,
    doctor_name: str,
    clinic_name: str,
    due_date,
    notes: str | None = None,
) -> bool:
    """Envía recordatorio de seguimiento al paciente."""
    date_str = due_date.strftime("%d/%m/%Y") if hasattr(due_date, "strftime") else str(due_date)
    notes_block = f"""
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:14px;width:120px;">Indicaciones</td>
          <td style="padding:6px 0;color:#111827;font-size:14px;">{notes}</td>
        </tr>
    """ if notes else ""

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Recordatorio de seguimiento</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a,#2d2d2d);padding:28px 40px;text-align:center;">
            <div style="display:inline-block;background:#d97706;border-radius:10px;padding:7px 18px;margin-bottom:10px;">
              <span style="color:#fff;font-size:17px;font-weight:700;">MedControl</span>
            </div>
            <p style="color:#d1d5db;font-size:13px;margin:0;">{clinic_name}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#6b7280;font-size:14px;margin:0 0 4px;">Hola,</p>
            <h1 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 8px;">Recordatorio de consulta de seguimiento</h1>
            <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
              Estimado/a <strong style="color:#111827;">{patient_name}</strong>, tu médico <strong style="color:#111827;">Dr. {doctor_name}</strong> ha programado una consulta de seguimiento para ti.
            </p>
            <table width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
              <tr>
                <td>
                  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:14px;text-align:center;">
                    <p style="color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px;font-weight:600;">Fecha de seguimiento</p>
                    <p style="color:#d97706;font-size:24px;font-weight:800;margin:0;">{date_str}</p>
                  </div>
                  <table width="100%">
                    <tr>
                      <td style="padding:5px 0;color:#6b7280;font-size:13px;width:110px;">Médico</td>
                      <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">Dr. {doctor_name}</td>
                    </tr>
                    {notes_block}
                  </table>
                </td>
              </tr>
            </table>
            <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
              Por favor, contactá a la clínica para confirmar tu cita de seguimiento.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f3f4f6;padding:18px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:11px;margin:0;">
              Este recordatorio fue enviado por <strong>{clinic_name}</strong> a través de MedControl.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    subject = f"Recordatorio de seguimiento — {date_str}"

    if not settings.resend_api_key:
        logger.info("[Email SIMULADO] Seguimiento → %s | Asunto: %s", patient_email, subject)
        return True

    def _send() -> bool:
        import resend
        resend.api_key = settings.resend_api_key
        try:
            resend.Emails.send({
                "from": settings.resend_email_from,
                "to": [patient_email],
                "subject": subject,
                "html": html,
            })
            logger.info("[Email] Seguimiento enviado a %s", patient_email)
            return True
        except Exception as exc:
            logger.error("[Email] Error seguimiento a %s: %s", patient_email, exc)
            return False

    return await asyncio.to_thread(_send)
