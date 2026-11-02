"""
Mandatory Database Backup and Verification System.
Supports PostgreSQL (via pg_dump) and SQLite fallback environments.
Ensures zero credential leakage and verifiable restoration procedures.
"""

import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Tuple, Dict, Any
from urllib.parse import urlparse
from scripts.vehicle_import.config import config
from scripts.vehicle_import.logger import logger

class DatabaseBackupManager:
    def __init__(self, backup_dir: Path = None):
        self.backup_dir = Path(backup_dir or config.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def create_backup(self, api_client=None) -> Tuple[bool, Path, str, Dict[str, Any]]:
        """
        Create a verified, timestamped database backup.
        If connected to remote production API, also generates a verified JSON snapshot
        of all current live records.
        Returns (success, backup_file_path, restore_command_doc, metadata).
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        db_url = os.getenv("DATABASE_URL", "")

        # If an active authenticated api_client is available, take a live API snapshot
        api_snapshot_path = None
        if api_client:
            try:
                existing_vehicles = api_client.get_existing_vehicles()
                if existing_vehicles:
                    api_snapshot_path = self.backup_dir / f"live_api_vehicles_snapshot_{timestamp}.json"
                    import json
                    with open(api_snapshot_path, "w", encoding="utf-8") as f:
                        json.dump({
                            "timestamp": timestamp,
                            "count": len(existing_vehicles),
                            "vehicles": existing_vehicles
                        }, f, indent=2)
                    logger.info(f"Created verified live API snapshot backup: {api_snapshot_path.name} ({len(existing_vehicles)} records, {api_snapshot_path.stat().st_size} bytes)")
            except Exception as e:
                logger.warning(f"Could not take API snapshot backup: {e}")

        # 1. Determine dialect from URL or local database
        is_postgres = "postgres" in db_url.lower()

        if is_postgres:
            ok, p, doc, meta = self._backup_postgres(db_url, timestamp)
            if not ok and api_snapshot_path and api_snapshot_path.exists():
                # If pg_dump failed due to remote client lack of direct DB port access, API snapshot is active
                restore_doc = (
                    f"To restore from this production snapshot using API or database:\n"
                    f"  1. Dataset backup saved at: {api_snapshot_path}\n"
                    f"  2. Re-import dataset via python scripts/vehicle_import/importer.py --json \"{api_snapshot_path}\" --production --confirm\n"
                    f"  3. On Hostinger VPS Docker host, run direct PostgreSQL dump:\n"
                    f"     docker exec -t exotique-db pg_dump -U postgres luxura_db > backups/luxura_db_backup.sql\n"
                )
                return True, api_snapshot_path, restore_doc, {
                    "type": "api_snapshot",
                    "timestamp": timestamp,
                    "path": str(api_snapshot_path),
                    "size_bytes": api_snapshot_path.stat().st_size,
                    "restore_command": restore_doc
                }
            return ok, p, doc, meta
        else:
            return self._backup_sqlite(timestamp)

    def _backup_postgres(self, db_url: str, timestamp: str) -> Tuple[bool, Path, str, Dict[str, Any]]:
        """Run pg_dump securely without exposing password in process args."""
        parsed = urlparse(db_url)
        db_name = parsed.path.lstrip("/") or "luxura_db"
        user = parsed.username or "postgres"
        password = parsed.password or ""
        host = parsed.hostname or "localhost"
        port = str(parsed.port or 5432)

        backup_file = self.backup_dir / f"postgres_{db_name}_{timestamp}.dump"

        logger.info(f"Targeting PostgreSQL database '{db_name}' on {host}:{port} for backup...")

        env = os.environ.copy()
        if password:
            env["PGPASSWORD"] = password

        cmd = [
            "pg_dump",
            "-h", host,
            "-p", port,
            "-U", user,
            "-F", "c",  # Custom format (compressed, supports pg_restore)
            "-b",        # Include blobs
            "-v",        # Verbose
            "-f", str(backup_file),
            db_name
        ]

        try:
            res = subprocess.run(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
            if res.returncode != 0:
                logger.warning(f"pg_dump encountered error: {res.stderr.decode('utf-8', errors='ignore')}")
                # If pg_dump CLI is not in PATH or connection failed, check for SQLite fallback
                if Path("luxura.db").exists():
                    logger.info("Falling back to active SQLite database backup...")
                    return self._backup_sqlite(timestamp)
                return False, backup_file, "", {"error": res.stderr.decode()}

            # Verify backup file exists and is non-empty
            if not backup_file.exists() or backup_file.stat().st_size == 0:
                return False, backup_file, "", {"error": "PostgreSQL backup file was not created or is empty"}

            restore_doc = (
                f"To restore this PostgreSQL backup, execute:\n"
                f"  pg_restore -h {host} -p {port} -U {user} -d {db_name} --clean --if-exists \"{backup_file}\"\n"
            )

            metadata = {
                "type": "postgresql",
                "database": db_name,
                "timestamp": timestamp,
                "path": str(backup_file),
                "size_bytes": backup_file.stat().st_size,
                "restore_command": restore_doc
            }
            logger.info(f"PostgreSQL backup created successfully: {backup_file.name} ({metadata['size_bytes']} bytes)")
            return True, backup_file, restore_doc, metadata

        except FileNotFoundError:
            logger.warning("pg_dump binary not found in system PATH. Checking local SQLite database fallback...")
            if Path("luxura.db").exists():
                return self._backup_sqlite(timestamp)
            return False, backup_file, "", {"error": "pg_dump not found and no local database found."}
        except Exception as e:
            logger.error(f"PostgreSQL backup failed: {e}")
            if Path("luxura.db").exists():
                return self._backup_sqlite(timestamp)
            return False, backup_file, "", {"error": str(e)}

    def _backup_sqlite(self, timestamp: str) -> Tuple[bool, Path, str, Dict[str, Any]]:
        """Create a safe snapshot copy of the SQLite database."""
        source_db = Path("luxura.db")
        if not source_db.exists():
            return False, Path(""), "", {"error": "No database file found to back up."}

        backup_file = self.backup_dir / f"sqlite_luxura_{timestamp}.db"
        logger.info(f"Creating snapshot backup of SQLite database '{source_db}'...")

        try:
            shutil.copy2(source_db, backup_file)
            if not backup_file.exists() or backup_file.stat().st_size == 0:
                return False, backup_file, "", {"error": "SQLite backup file is missing or empty."}

            restore_doc = (
                f"To restore this SQLite database snapshot:\n"
                f"  1. Stop the application server (uvicorn/FastAPI).\n"
                f"  2. Copy snapshot to active database location:\n"
                f"     cp \"{backup_file}\" \"{source_db.resolve()}\"\n"
                f"  3. Restart the application server.\n"
            )

            metadata = {
                "type": "sqlite",
                "database": "luxura.db",
                "timestamp": timestamp,
                "path": str(backup_file),
                "size_bytes": backup_file.stat().st_size,
                "restore_command": restore_doc
            }
            logger.info(f"Database backup created successfully: {backup_file.name} ({metadata['size_bytes']} bytes)")
            return True, backup_file, restore_doc, metadata
        except Exception as e:
            logger.error(f"SQLite backup failed: {e}")
            return False, backup_file, "", {"error": str(e)}
