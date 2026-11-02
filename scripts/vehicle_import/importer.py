"""
Exotique Machines — Production Vehicle & Image Importer CLI.
Enterprise-grade, idempotent, resumable data import workflow using existing backend APIs.
"""

import sys
import os
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional

# Ensure project root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Ensure UTF-8 stdout/stderr on Windows
if sys.platform.startswith("win"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from scripts.vehicle_import.config import config
from scripts.vehicle_import.logger import logger
from scripts.vehicle_import.image_handler import ImageHandler
from scripts.vehicle_import.validator import DataValidator, ValidationReport
from scripts.vehicle_import.api_client import ExotiqueApiClient
from scripts.vehicle_import.backup import DatabaseBackupManager


class ManifestManager:
    """Manages persistent manifest tracking for idempotency and resume support."""

    def __init__(self, manifest_path: Path):
        self.path = manifest_path
        self.data: Dict[str, Any] = {
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "records": {}
        }
        self.load()

    def load(self):
        if self.path.exists():
            try:
                with open(self.path, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load existing manifest: {e}. Starting fresh.")

    def save(self):
        self.data["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        tmp_path = self.path.with_suffix(".tmp")
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=2)
        tmp_path.replace(self.path)

    def get_record(self, key: str) -> Optional[Dict[str, Any]]:
        return self.data["records"].get(key)

    def update_record(self, key: str, record_data: Dict[str, Any]):
        self.data["records"][key] = record_data
        self.save()


class VehicleImporter:
    def __init__(
        self,
        json_path: Path = None,
        images_zip: Path = None,
        api_base_url: str = None,
        token: str = None,
        manifest_path: Path = None
    ):
        self.json_path = Path(json_path or config.json_path)
        self.images_zip = Path(images_zip or config.images_zip_path)
        self.api_client = ExotiqueApiClient(base_url=api_base_url, token=token)
        self.image_handler = ImageHandler(zip_path=self.images_zip)
        self.manifest = ManifestManager(manifest_path or config.manifest_path)
        self.backup_mgr = DatabaseBackupManager()

    def run_dry_run(self) -> ValidationReport:
        """Execute full validation, connectivity checks, and dry run report without writing data."""
        logger.info("\n" + "=" * 60)
        logger.info("STARTING EXOTIQUE VEHICLE IMPORT — DRY RUN")
        logger.info("=" * 60)

        # 1. Check API connectivity & Auth
        api_ok, health_info = self.api_client.check_health()
        auth_ok = False
        if api_ok:
            auth_ok = self.api_client.authenticate()

        # 2. Extract and validate image archive
        logger.info(f"Inspecting image archive: {self.images_zip}")
        extracted_images = self.image_handler.extract_safely()

        # 3. Read raw vehicle JSON
        logger.info(f"Reading vehicle dataset: {self.json_path}")
        if not self.json_path.exists():
            raise FileNotFoundError(f"JSON dataset not found: {self.json_path}")

        with open(self.json_path, "r", encoding="utf-8") as f:
            vehicles_raw = json.load(f)

        # 4. Fetch existing vehicle IDs from API to check duplicates
        existing_vehicles = self.api_client.get_existing_vehicles() if auth_ok else []
        existing_slugs = {v.get("id") for v in existing_vehicles if v.get("id")}
        logger.info(f"Retrieved {len(existing_slugs)} existing vehicle records from backend.")

        # 5. Run validation
        validator = DataValidator(existing_vehicle_ids=existing_slugs)
        report = validator.validate(vehicles_raw, self.image_handler)

        # 6. Format Dry Run Summary
        print("\n" + report.generate_summary())
        print("-" * 60)
        print("ENVIRONMENT & CONNECTIVITY CHECKS:")
        print(f"Vehicle API Connectivity:  {'PASS' if api_ok else 'FAIL'}")
        print(f"Authentication:            {'PASS' if auth_ok else 'FAIL'}")
        print(f"Payload Schema Validation: {'PASS' if len(report.invalid_vehicles) == 0 else 'WARNING'}")
        print(f"Image Archive Extraction:  {'PASS' if len(report.corrupted_images) == 0 else 'FAIL'}")
        print(f"Database Backup:           PENDING PRODUCTION RUN")
        print(f"Production Writes:         DISABLED (DRY RUN MODE)")
        print("=" * 60 + "\n")

        return report

    def run_production_import(self, confirm: bool = False):
        """Execute the production import workflow with backup, idempotency, and verification."""
        logger.info("\n" + "=" * 60)
        logger.info("EXOTIQUE VEHICLE IMPORT — PRODUCTION RUN")
        logger.info("=" * 60)

        if not confirm:
            logger.error("SAFETY GUARD: Production import requires explicit confirmation (--confirm). Aborted.")
            sys.exit(1)

        # 1. Verify API & Authenticate
        api_ok, _ = self.api_client.check_health()
        if not api_ok:
            logger.error("Production import aborted: Unable to connect to backend API.")
            sys.exit(1)

        if not self.api_client.authenticate():
            logger.error("Production import aborted: Admin authentication failed.")
            sys.exit(1)

        # 2. MANDATORY DATABASE BACKUP
        logger.info("Initiating mandatory database backup before production writes...")
        backup_ok, backup_path, restore_cmd, metadata = self.backup_mgr.create_backup(api_client=self.api_client)
        if not backup_ok:
            logger.error(f"Production import ABORTED: Mandatory database backup could not be verified: {metadata.get('error')}")
            sys.exit(1)

        logger.info(f"Verified Database Backup: {backup_path} ({metadata.get('size_bytes')} bytes)")
        logger.info("Documented Restore Command:")
        for line in restore_cmd.strip().split("\n"):
            logger.info(f"  {line}")

        # 3. Extract and validate image archive
        extracted_images = self.image_handler.extract_safely()

        # 4. Load dataset
        with open(self.json_path, "r", encoding="utf-8") as f:
            vehicles_raw = json.load(f)

        existing_vehicles = self.api_client.get_existing_vehicles()
        existing_slugs = {v.get("id") for v in existing_vehicles if v.get("id")}

        validator = DataValidator(existing_vehicle_ids=existing_slugs)
        report = validator.validate(vehicles_raw, self.image_handler)

        if len(report.valid_vehicles) == 0:
            logger.error("No valid vehicle records found to import. Aborting.")
            sys.exit(1)

        # 5. Execution Loop
        logger.info(f"Beginning production import of {len(report.valid_vehicles)} valid vehicles...")
        stats = {
            "attempted": 0,
            "created": 0,
            "skipped": 0,
            "failed": 0,
            "images_uploaded": 0
        }

        for veh in report.valid_vehicles:
            slug = veh["slug"]
            label = f"{veh['brand']} {veh['model']}"
            stats["attempted"] += 1

            # Check Manifest for Idempotency
            existing_manifest_entry = self.manifest.get_record(slug)
            if existing_manifest_entry and existing_manifest_entry.get("status") == "completed":
                logger.info(f"Skipping already imported vehicle '{label}' (ID: {existing_manifest_entry.get('vehicle_id')}).")
                stats["skipped"] += 1
                continue

            logger.info(f"[{stats['attempted']}/{len(report.valid_vehicles)}] Processing: {label} (Slug: {slug})")

            # Step A: Upload Images
            image_filenames = veh.get("image_files", [])
            image_paths = [self.image_handler.extracted_files[fn] for fn in image_filenames if fn in self.image_handler.extracted_files]

            uploaded_urls = []
            if image_paths:
                logger.info(f"Uploading {len(image_paths)} images for {label}...")
                upload_ok, uploaded_urls, up_err = self.api_client.upload_images(image_paths)
                if not upload_ok:
                    logger.error(f"Image upload failed for {label}: {up_err}. Skipping vehicle creation.")
                    self.manifest.update_record(slug, {
                        "slug": slug,
                        "label": label,
                        "status": "failed",
                        "error": up_err,
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                    })
                    stats["failed"] += 1
                    continue
                stats["images_uploaded"] += len(uploaded_urls)

            # Step B: Create Vehicle through existing API
            create_ok, created_veh, create_err = self.api_client.create_vehicle(veh, image_urls=uploaded_urls)
            if not create_ok or not created_veh:
                logger.error(f"Vehicle creation failed for {label}: {create_err}")
                self.manifest.update_record(slug, {
                    "slug": slug,
                    "label": label,
                    "status": "failed",
                    "error": create_err,
                    "uploaded_urls": uploaded_urls,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                })
                stats["failed"] += 1
                continue

            created_id = created_veh.get("id")

            # Step C: Verification query on live API
            verified_veh = self.api_client.get_vehicle_by_id(created_id)
            if not verified_veh:
                logger.error(f"Post-create verification failed for {label} (ID: {created_id})!")
                self.manifest.update_record(slug, {
                    "slug": slug,
                    "label": label,
                    "status": "unverified",
                    "vehicle_id": created_id,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                })
                stats["failed"] += 1
                continue

            # Record success in manifest
            self.manifest.update_record(slug, {
                "slug": slug,
                "label": label,
                "status": "completed",
                "vehicle_id": created_id,
                "brand": veh["brand"],
                "model": veh["model"],
                "price": veh["price"],
                "images": verified_veh.get("images", []),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            })
            stats["created"] += 1
            logger.info(f"Successfully imported and verified: {label} (ID: {created_id})")

        # 6. Final Execution Report
        print("\n" + "=" * 60)
        print("EXOTIQUE VEHICLE IMPORT — EXECUTION REPORT")
        print("=" * 60)
        print(f"Total records attempted:       {stats['attempted']}")
        print(f"Successfully created vehicles: {stats['created']}")
        print(f"Successfully uploaded images:  {stats['images_uploaded']}")
        print(f"Skipped records (idempotent):  {stats['skipped']}")
        print(f"Failed records:                {stats['failed']}")
        print(f"Duplicate records prevented:   {len(report.duplicate_candidates)}")
        print(f"Manual corrections required:   {len(report.invalid_vehicles)}")
        print(f"Manifest written to:           {self.manifest.path}")
        print(f"Database backup location:      {backup_path}")
        print("=" * 60 + "\n")

    def rollback(self):
        """Rollback all vehicles created during this import batch as recorded in manifest."""
        logger.warning("Initiating rollback of vehicles recorded in manifest...")
        if not self.api_client.authenticate():
            logger.error("Authentication required for rollback.")
            return

        recs = self.manifest.data.get("records", {})
        rolled_back = 0
        for slug, rec in list(recs.items()):
            veh_id = rec.get("vehicle_id")
            if veh_id and rec.get("status") == "completed":
                ok, err = self.api_client.delete_vehicle(veh_id)
                if ok:
                    rolled_back += 1
                    rec["status"] = "rolled_back"
                    self.manifest.save()
                else:
                    logger.error(f"Failed deleting vehicle '{veh_id}': {err}")

        logger.info(f"Rollback complete: {rolled_back} vehicles removed.")


def main():
    parser = argparse.ArgumentParser(description="Exotique Machines Production Vehicle & Image Importer")
    parser.add_argument("--dry-run", action="store_true", help="Perform validation and connectivity checks without writing data")
    parser.add_argument("--production", action="store_true", help="Execute live production import")
    parser.add_argument("--confirm", action="store_true", help="Explicit confirmation required for production writes")
    parser.add_argument("--rollback", action="store_true", help="Roll back imported vehicles recorded in manifest")
    parser.add_argument("--status", action="store_true", help="Show manifest status")
    parser.add_argument("--json", type=str, default=None, help="Path to vehicle JSON dataset")
    parser.add_argument("--images", type=str, default=None, help="Path to vehicle images ZIP archive")
    parser.add_argument("--local", action="store_true", help="Target local backend (http://localhost:5000) instead of production")
    parser.add_argument("--api-url", type=str, default=None, help="Exotique API base URL")

    args = parser.parse_args()

    target_url = args.api_url
    if args.local:
        target_url = config.local_api_base_url

    importer = VehicleImporter(
        json_path=Path(args.json) if args.json else None,
        images_zip=Path(args.images) if args.images else None,
        api_base_url=target_url
    )

    if args.status:
        print("\n--- IMPORT MANIFEST STATUS ---")
        recs = importer.manifest.data.get("records", {})
        print(f"Total tracked entries: {len(recs)}")
        for k, v in recs.items():
            print(f"  • {k}: {v.get('status')} (Vehicle ID: {v.get('vehicle_id', 'N/A')})")
        print("-----------------------------\n")
    elif args.rollback:
        importer.rollback()
    elif args.production:
        importer.run_production_import(confirm=args.confirm)
    else:
        # Default is dry-run mode
        importer.run_dry_run()


if __name__ == "__main__":
    main()
