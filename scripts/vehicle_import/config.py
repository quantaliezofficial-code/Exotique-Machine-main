"""
Configuration settings for the Exotique Vehicle Import Utility.
Reads sensitive parameters from environment variables with safe defaults.
Never hardcodes production credentials.
"""

import os
from pathlib import Path
from dataclasses import dataclass

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent

@dataclass
class ImportConfig:
    # API Endpoints & Auth
    api_base_url: str = os.getenv("EXOTIQUE_API_BASE_URL", "https://exotiquemachines.com").rstrip("/")
    local_api_base_url: str = "http://localhost:5000"
    api_token: str = os.getenv("EXOTIQUE_API_TOKEN", "")
    admin_username: str = os.getenv("EXOTIQUE_ADMIN_USERNAME", "superadmin")
    admin_password: str = os.getenv("EXOTIQUE_ADMIN_PASSWORD", "superadmin123")

    # Data Source Paths
    json_path: Path = Path(os.getenv("IMPORT_JSON_PATH", str(PROJECT_ROOT / "data" / "vehicles.json")))
    images_zip_path: Path = Path(os.getenv("IMPORT_IMAGES_ZIP", str(PROJECT_ROOT / "data" / "vehicle-images.zip")))

    # Extraction and Manifest Locations
    extract_dir: Path = SCRIPT_DIR / "extracted_images"
    manifest_path: Path = Path(os.getenv("IMPORT_MANIFEST_PATH", str(SCRIPT_DIR / "import_manifest.json")))
    backup_dir: Path = Path(os.getenv("EXOTIQUE_BACKUP_DIR", str(PROJECT_ROOT / "backups")))
    logs_dir: Path = SCRIPT_DIR / "logs"

    # Network & Concurrency Guardrails
    request_timeout: int = int(os.getenv("EXOTIQUE_REQUEST_TIMEOUT", "30"))
    max_retries: int = int(os.getenv("EXOTIQUE_MAX_RETRIES", "3"))
    retry_backoff_factor: float = float(os.getenv("EXOTIQUE_RETRY_BACKOFF", "1.5"))
    rate_limit_delay: float = float(os.getenv("EXOTIQUE_RATE_LIMIT_DELAY", "0.25"))

    # File limits
    max_image_size_mb: int = 15
    allowed_extensions: tuple = (".jpg", ".jpeg", ".png", ".webp")

    def ensure_directories(self):
        self.extract_dir.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)

config = ImportConfig()
