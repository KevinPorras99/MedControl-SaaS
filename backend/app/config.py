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

    class Config:
        env_file = ".env"


settings = Settings()
