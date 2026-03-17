import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.limiter import limiter
from app.routers import (
    auth_router,
    patients_router,
    appointments_router,
    medical_records_router,
    invoices_router,
    settings_router,
    reports_router,
    assistant_router,
    audit_router,
    config_router,
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

# ── Rate limiting ──────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Security headers ──────────────────────────────
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://clerk.com https://*.clerk.accounts.dev; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com; "
            "font-src 'self' data:; "
            "frame-ancestors 'none';"
        )
        # API responses must not be cached by proxies or shared caches
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
        if settings.app_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
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
app.include_router(assistant_router)
app.include_router(audit_router)
app.include_router(config_router)
# app.include_router(billing_router)  # deshabilitado hasta configurar Stripe


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    # Never expose internal exception details to clients in production
    if settings.app_env == "production":
        return JSONResponse(
            status_code=500,
            content={"detail": "Error interno del servidor. Por favor intente más tarde."},
        )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Error interno: {type(exc).__name__}: {exc}"},
    )


@app.get("/health", tags=["Sistema"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}

