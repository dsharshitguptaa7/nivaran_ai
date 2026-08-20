from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ==================================================
    # CORS CONFIGURATION
    # ==================================================

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # ==================================================
    # STORAGE CONFIGURATION
    # ==================================================

    STORAGE_DIR: str = ""

    @property
    def upload_dir(self) -> Path:
        if self.STORAGE_DIR:
            p = Path(self.STORAGE_DIR)
        else:
            p = Path(__file__).resolve().parent.parent.parent / "storage" / "documents"
        p.mkdir(parents=True, exist_ok=True)
        return p

    # ==================================================
    # EMAIL / SMTP
    # ==================================================

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "NIVARAN-AI <noreply@nivaran.ac.in>"
    SMTP_FROM_EMAIL: str = "noreply@nivaran.ac.in"
    SMTP_FROM_NAME: str = "NIVARAN-AI"

    # ==================================================
    # FRONTEND
    # ==================================================

    FRONTEND_URL: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()