from app.routers.auth import router as auth_router
from app.routers.patients import router as patients_router
from app.routers.appointments import router as appointments_router
from app.routers.medical_records import router as medical_records_router
from app.routers.invoices import router as invoices_router
from app.routers.settings import router as settings_router
from app.routers.reports import router as reports_router
from app.routers.assistant import router as assistant_router
from app.routers.audit import router as audit_router
from app.routers.config import router as config_router
from app.routers.notifications import router as notifications_router
from app.routers.reminders import router as reminders_router
from app.routers.portal import router as portal_router
from app.routers.consents import router as consents_router
from app.routers.inventory import router as inventory_router
from app.routers.superadmin import router as superadmin_router
# from app.routers.billing import router as billing_router  # deshabilitado hasta configurar Stripe

__all__ = [
    "auth_router",
    "patients_router",
    "appointments_router",
    "medical_records_router",
    "invoices_router",
    "settings_router",
    "reports_router",
    "assistant_router",
    "audit_router",
    "config_router",
    "notifications_router",
    "reminders_router",
    "portal_router",
    "consents_router",
    "inventory_router",
    "superadmin_router",
]
