from app.routers.auth import router as auth_router
from app.routers.patients import router as patients_router
from app.routers.appointments import router as appointments_router
from app.routers.medical_records import router as medical_records_router
from app.routers.invoices import router as invoices_router
from app.routers.settings import router as settings_router
from app.routers.reports import router as reports_router
# from app.routers.billing import router as billing_router  # deshabilitado hasta configurar Stripe

__all__ = [
    "auth_router",
    "patients_router",
    "appointments_router",
    "medical_records_router",
    "invoices_router",
    "settings_router",
    "reports_router",
]
