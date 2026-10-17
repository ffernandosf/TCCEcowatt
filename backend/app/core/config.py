from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://user:password@localhost:5432/monitor_energia"
    firebase_service_account_path: str = "./firebase-service-account.json"
    firebase_service_account_json: str = ""
    firebase_database_url: str = ""
    tariff_rate_brl_per_kwh: float = 0.75
    tariff_flag: str = "green"
    carbon_intensity_kg_per_kwh: float = 0.08
    standby_threshold_w: float = 15.0
    standby_min_minutes: int = 30
    cors_allowed_origins: str = ""


settings = Settings()
