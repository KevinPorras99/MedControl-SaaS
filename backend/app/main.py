import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.routers import (
    auth_router,
    patients_router,
    appointments_router,
    medical_records_router,
    invoices_router,
    settings_router,
    reports_router,
)
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────
    from app import storage
    await storage.ensure_bucket()
    start_scheduler()

    yield  # la app corre aquí

    # ── Shutdown ─────────────────────────────────
    stop_scheduler()


# En producción, ocultar docs de la API pública
_docs_url = "/docs" if settings.app_env != "production" else None
_redoc_url = "/redoc" if settings.app_env != "production" else None

app = FastAPI(
    title="MedControl API",
    description="Sistema de Gestión para Clínicas Privadas",
    version="1.0.0",
    docs_url=_docs_url,
    redoc_url=_redoc_url,
    lifespan=lifespan,
)


# ── Security headers ──────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.app_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# ── CORS ──────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ── Routers ───────────────────────────────────────
app.include_router(auth_router)
app.include_router(patients_router)
app.include_router(appointments_router)
app.include_router(medical_records_router)
app.include_router(invoices_router)
app.include_router(settings_router)
app.include_router(reports_router)
# app.include_router(billing_router)  # deshabilitado hasta configurar Stripe


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno: {type(exc).__name__}: {exc}"},
    )


@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}
