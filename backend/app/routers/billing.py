import stripe
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.dependencies import CurrentUser, RequireAdmin
from app.models.clinic import Clinic

stripe.api_key = settings.stripe_secret_key

router = APIRouter(prefix="/api/billing", tags=["Suscripciones"])

# Mapeo plan → Price ID de Stripe (configurados en .env)
PLAN_PRICES: dict[str, str] = {
    "profesional": settings.stripe_price_profesional,
    "clinica": settings.stripe_price_clinica,
}

PLAN_LABELS = {
    "basico": "Básico",
    "profesional": "Profesional",
    "clinica": "Clínica",
}

STATUS_MAP = {
    "active": "active",
    "trialing": "trialing",
    "past_due": "past_due",
    "canceled": "canceled",
    "unpaid": "past_due",
    "incomplete": "incomplete",
    "incomplete_expired": "canceled",
}


class CheckoutRequest(BaseModel):
    plan: str  # "profesional" | "clinica"


async def _get_clinic_by_id(clinic_id, db: AsyncSession) -> Clinic | None:
    result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
    return result.scalar_one_or_none()


async def _get_clinic_by_stripe_customer(customer_id: str, db: AsyncSession) -> Clinic | None:
    result = await db.execute(select(Clinic).where(Clinic.stripe_customer_id == customer_id))
    return result.scalar_one_or_none()


# ── GET suscripción actual ────────────────────────────────────────────────────
@router.get("/subscription", dependencies=[RequireAdmin])
async def get_subscription(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Devuelve el estado actual de la suscripción de la clínica."""
    clinic = await _get_clinic_by_id(current_user.clinic_id, db)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")
    return {
        "plan": clinic.subscription_plan,
        "status": clinic.subscription_status,
        "stripe_customer_id": clinic.stripe_customer_id,
        "stripe_subscription_id": clinic.stripe_subscription_id,
    }


# ── POST crear sesión de checkout ────────────────────────────────────────────
@router.post("/checkout", dependencies=[RequireAdmin])
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Crea una Checkout Session de Stripe para suscribirse a un plan."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe no está configurado en este entorno.")

    plan = body.plan
    if plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail=f"Plan inválido. Opciones: {list(PLAN_PRICES.keys())}")

    price_id = PLAN_PRICES[plan]
    if not price_id:
        raise HTTPException(
            status_code=500,
            detail=f"El Price ID de Stripe para el plan '{plan}' no está configurado. Agregá STRIPE_PRICE_{plan.upper()} al .env.",
        )

    clinic = await _get_clinic_by_id(current_user.clinic_id, db)
    if not clinic:
        raise HTTPException(status_code=404, detail="Clínica no encontrada")

    # Crear o reutilizar Customer en Stripe
    customer_id = clinic.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=clinic.name,
            metadata={"clinic_id": str(clinic.id)},
        )
        customer_id = customer.id
        clinic.stripe_customer_id = customer_id
        await db.flush()

    base_url = settings.app_frontend_url
    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{base_url}/settings?billing=success",
        cancel_url=f"{base_url}/settings?billing=cancel",
        metadata={"clinic_id": str(clinic.id), "plan": plan},
        subscription_data={"metadata": {"clinic_id": str(clinic.id), "plan": plan}},
    )

    return {"checkout_url": session.url}


# ── POST portal de cliente ────────────────────────────────────────────────────
@router.post("/portal", dependencies=[RequireAdmin])
async def customer_portal(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Redirige al admin al Customer Portal de Stripe para gestionar su suscripción."""
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Stripe no está configurado en este entorno.")

    clinic = await _get_clinic_by_id(current_user.clinic_id, db)
    if not clinic or not clinic.stripe_customer_id:
        raise HTTPException(status_code=400, detail="No hay una suscripción activa. Suscribite primero desde los planes.")

    base_url = settings.app_frontend_url
    session = stripe.billing_portal.Session.create(
        customer=clinic.stripe_customer_id,
        return_url=f"{base_url}/settings",
    )
    return {"portal_url": session.url}


# ── POST webhook de Stripe ────────────────────────────────────────────────────
@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: Annotated[str | None, Header(alias="stripe-signature")] = None,
    db: AsyncSession = Depends(get_db),
):
    """Recibe eventos de Stripe y actualiza el estado de suscripción de la clínica."""
    payload = await request.body()

    if not settings.stripe_webhook_secret:
        # En development sin webhook secret simplemente parseamos el payload
        event = stripe.Event.construct_from(
            stripe.util.convert_to_stripe_object(stripe.util.json.loads(payload)),
            stripe.api_key,
        )
    else:
        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, settings.stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Firma de webhook inválida")

    ev_type = event["type"]
    data = event["data"]["object"]

    # ── checkout.session.completed → suscripción nueva creada ─────────────────
    if ev_type == "checkout.session.completed":
        clinic_id = data.get("metadata", {}).get("clinic_id")
        plan = data.get("metadata", {}).get("plan")
        subscription_id = data.get("subscription")

        if clinic_id:
            result = await db.execute(select(Clinic).where(Clinic.id == clinic_id))
            clinic = result.scalar_one_or_none()
            if clinic:
                clinic.stripe_subscription_id = subscription_id
                clinic.subscription_plan = plan or clinic.subscription_plan
                clinic.subscription_status = "active"
                await db.flush()

    # ── customer.subscription.updated ────────────────────────────────────────
    elif ev_type == "customer.subscription.updated":
        customer_id = data.get("customer")
        clinic = await _get_clinic_by_stripe_customer(customer_id, db)
        if clinic:
            sub_status = STATUS_MAP.get(data.get("status", ""), "inactive")
            # Resolve plan from price
            items = data.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id", "")
                plan = next((k for k, v in PLAN_PRICES.items() if v == price_id), None)
                if plan:
                    clinic.subscription_plan = plan
            clinic.subscription_status = sub_status
            await db.flush()

    # ── customer.subscription.deleted → cancelada ─────────────────────────────
    elif ev_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        clinic = await _get_clinic_by_stripe_customer(customer_id, db)
        if clinic:
            clinic.subscription_plan = "basico"
            clinic.subscription_status = "canceled"
            clinic.stripe_subscription_id = None
            await db.flush()

    return {"received": True}
