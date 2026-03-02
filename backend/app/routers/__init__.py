from app.routers.patients import router as patients_router
from app.routers.appointments import router as appointments_router
from app.routers.medical_records import router as medical_records_router
from app.routers.invoices import router as invoices_router

__all__ = [
    "patients_router",
    "appointments_router",
    "medical_records_router",
    "invoices_router",
]
