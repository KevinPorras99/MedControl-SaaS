"""
Endpoint público (autenticado) que expone las constantes de negocio de la aplicación.
El frontend NO debe hardcodear tasas, enums ni constantes: los obtiene de aquí.
"""
from fastapi import APIRouter
from app.dependencies import RequireAnyRole

router = APIRouter(prefix="/api/config", tags=["Configuración app"])


@router.get("", dependencies=[RequireAnyRole])
async def get_app_config():
    """Constantes de negocio centralizadas. Único punto de verdad para frontend."""
    return {
        "iva_rate": 0.13,
        "currency": "₡",
        "currency_code": "CRC",
        "appointment_statuses": ["programada", "confirmada", "atendida", "cancelada"],
        "payment_methods": ["efectivo", "tarjeta", "transferencia"],
        "invoice_statuses": ["pendiente", "pagada", "anulada"],
        "user_roles": {
            "admin_clinic": "Administrador",
            "doctor": "Médico",
            "receptionist": "Recepcionista",
        },
        "attachment_max_mb": 10,
        "patients_per_page": 200,
    }
