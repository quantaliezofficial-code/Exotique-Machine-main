import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
ENV_FILE = PROJECT_DIR / ".env"

class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Exotique Machines - Luxura Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 5000

    # PostgreSQL Database Settings
    # Format: postgresql+psycopg2://user:password@host:port/database_name
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:postgres@localhost:5432/luxura_db"
    )
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", 5432))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "luxura_db")
    
    # Graceful Fallback if PostgreSQL is unreachable during setup
    FALLBACK_TO_SQLITE: bool = True
    SQLITE_URL: str = f"sqlite:///{PROJECT_DIR / 'luxura.db'}"

    # JWT Authentication
    JWT_SECRET: str = os.getenv("JWT_SECRET", "exotique_machines_jwt_secret_token_key_2026")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_DAYS: int = 7

    # Rate Limiting & Brute Force Prevention
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_TIME_SECONDS: int = 15 * 60  # 15 minutes

    # Storage Paths
    PROJECT_ROOT: Path = PROJECT_DIR
    UPLOADS_DIR: Path = PROJECT_DIR / "server" / "uploads"
    DATA_DIR: Path = PROJECT_DIR / "server" / "data"
    DIST_DIR: Path = PROJECT_DIR / "dist"

    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
