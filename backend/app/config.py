from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    database_url: str
    clerk_secret_key: str
    clerk_publishable_key: str
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    app_env: str = "development"
    app_port: int = 8000
    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_profesional: str = ""
    stripe_price_clinica: str = ""
    # Frontend URL (para redirect URLs de Stripe y CORS en producción)
    app_frontend_url: str = "http://localhost:5173"
    # Groq AI Assistant (free tier)
    groq_api_key: str = ""
    # Resend (email transaccional)
    resend_api_key: str = ""
    resend_email_from: str = "MedControl <onboarding@resend.dev>"
    # Portal del paciente (JWT independiente de Clerk)
    portal_secret_key: str = ""

    @property
    def allowed_origins(self) -> list[str]:
        """CORS origins permitidos según el entorno."""
        if self.app_env == "production":
            return [self.app_frontend_url]
        return [
            self.app_frontend_url,
            "http://localhost:5173",
            "http://localhost:3000",
        ]

    class Config:
        env_file = ".env"


settings = Settings()
