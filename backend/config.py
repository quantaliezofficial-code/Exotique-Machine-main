import json
import logging
from pathlib import Path
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
ENV_FILE = PROJECT_DIR / ".env"

logger = logging.getLogger("luxura.config")

# Secrets that have been published in this repository at some point. They must never be
# accepted in production.
KNOWN_PUBLIC_SECRETS = {
    "exotique_machines_jwt_secret_token_key_2026",
    "superadmin123",
    "admin123",
    "admin12345",
    "postgres",
}


class Settings(BaseSettings):
    # App Information
    APP_NAME: str = "Exotique Machines - Luxura Backend"
    APP_VERSION: str = "2.1.0"
    ENVIRONMENT: str = "production"  # "production" | "development" | "test"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 5000

    # Public site
    SITE_URL: str = "https://exotiquemachines.com"
    SITE_NAME: str = "Exotique Machines"

    # Where the backend fetches the built SPA shell (index.html) from when rendering
    # SEO pages. In Docker this is the frontend nginx container on the shared network.
    FRONTEND_SHELL_URL: str = "http://exotique-frontend/_shell/index.html"

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/luxura_db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "luxura_db"

    # SQLite fallback is for local development only. In production a database outage
    # must fail loudly instead of silently writing to a throw-away file in the container.
    FALLBACK_TO_SQLITE: bool = False
    SQLITE_URL: str = f"sqlite:///{PROJECT_DIR / 'luxura.db'}"

    # JWT Authentication
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_HOURS: int = 12
    AUTH_COOKIE_NAME: str = "em_admin_session"
    COOKIE_SECURE: bool = True

    # Initial super admin (only used when no super admin exists, and to rotate a
    # super admin that still uses a published default password)
    SUPERADMIN_USERNAME: str = "superadmin"
    SUPERADMIN_PASSWORD: str = ""
    SUPERADMIN_NAME: str = "Exotique Administrator"

    # Rate Limiting & Brute Force Prevention
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_TIME_SECONDS: int = 15 * 60
    LOGIN_IP_LIMIT_PER_15_MIN: int = 30
    PUBLIC_FORM_LIMIT_PER_10_MIN: int = 8

    # Uploads
    MAX_UPLOAD_MB: int = 25
    MAX_IMAGE_PIXELS: int = 80_000_000
    MAX_IMAGE_SIDE: int = 12_000
    # Generate optimised variants right after an upload (in a background thread).
    EAGER_IMAGE_VARIANTS: bool = True

    # Storage Paths
    PROJECT_ROOT: Path = PROJECT_DIR
    UPLOADS_DIR: Path = PROJECT_DIR / "server" / "uploads"
    DATA_DIR: Path = PROJECT_DIR / "server" / "data"
    DIST_DIR: Path = PROJECT_DIR / "dist"

    # CORS — the public site and API are same-origin, so this is only needed for tooling.
    CORS_ORIGINS: List[str] = []

    # Interactive API docs are disabled in production unless explicitly enabled.
    ENABLE_API_DOCS: bool = False

    # Logging: "json" (production) or "text"
    LOG_FORMAT: str = "json"
    SLOW_REQUEST_MS: int = 800

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("["):
                return json.loads(v)
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("SITE_URL")
    @classmethod
    def _strip_slash(cls, v: str) -> str:
        return v.rstrip("/")

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024

    @property
    def originals_dir(self) -> Path:
        """Untouched uploaded files. Never served over HTTP (outside /uploads)."""
        return self.UPLOADS_DIR.parent / "originals"


settings = Settings()


def validate_security_settings(s: Settings) -> None:
    """Refuse to start in production with missing or published secrets."""
    problems: List[str] = []
    if not s.JWT_SECRET or len(s.JWT_SECRET) < 32 or s.JWT_SECRET in KNOWN_PUBLIC_SECRETS:
        problems.append("JWT_SECRET must be set to a random value of at least 32 characters")
    if "*" in s.CORS_ORIGINS:
        problems.append("CORS_ORIGINS must not contain '*' (credentials are enabled)")
    if s.is_production and s.DEBUG:
        problems.append("DEBUG must be False in production")
    if s.is_production and problems:
        raise RuntimeError("Insecure production configuration: " + "; ".join(problems))
    for p in problems:
        logger.warning("SECURITY (non-production): %s", p)


validate_security_settings(settings)

if not settings.JWT_SECRET:
    # Development/test only (production refuses to start above): random per-process key.
    import secrets as _secrets

    settings.JWT_SECRET = _secrets.token_urlsafe(48)

# Ensure directories exist
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.originals_dir.mkdir(parents=True, exist_ok=True)
