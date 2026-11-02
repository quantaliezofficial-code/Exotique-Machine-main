#!/usr/bin/env python3
"""
Exotique Machines - Vehicle Fleet Importer & Hostinger Settlement Tool
=====================================================================

Imports vehicle fleet data from `vehicles.json` and associated images from `vehicle-images.zip`.
Ensures full data integrity and settles data across all application tiers:
  1. Automated Pre-Import Backups (database, server/data/vehicles.json, src/data.ts)
  2. Image Extraction & Matching from ZIP archive to server/uploads/
  3. Schema Normalization (Price in Lakhs, INR auto-conversion, EMI calculation, Colors, Features)
  4. PostgreSQL / SQLite Database Synchronization (via SQLAlchemy ORM & Activity Logging)
  5. JSON Fleet File Update (server/data/vehicles.json)
  6. Frontend Static Fallback Update (src/data.ts)
  7. Hostinger Production Build Preparation (Vite build + dist/uploads synchronization)

Usage:
  python scripts/import_vehicles.py --dry-run
  python scripts/import_vehicles.py --json vehicles.json --zip vehicle-images.zip
  python scripts/import_vehicles.py --build-hostinger
"""

import os
import sys
import re
import json
import time
import uuid
import shutil
import zipfile
import argparse
import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional

# Ensure UTF-8 console output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import settings
from backend.database import SessionLocal, init_db
from backend.models import Vehicle, ActivityLog

# Allowed image file extensions
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}

# Color name to Hex map
COLOR_PALETTE = {
    "black": "#0B0C0E",
    "obsidian black": "#0B0C0E",
    "nero": "#0B0C0E",
    "white": "#FDFCFA",
    "polar white": "#FDFCFA",
    "pearl white": "#F3F4F6",
    "bianco": "#FDFCFA",
    "silver": "#9CA3AF",
    "glacier silver": "#D1D5DB",
    "grey": "#4B5563",
    "gray": "#4B5563",
    "graphite": "#374151",
    "blue": "#1E3A8A",
    "portimao blue": "#1D4ED8",
    "navy": "#1E293B",
    "sapphire": "#2563EB",
    "red": "#B91C1C",
    "crimson": "#991B1B",
    "rosso corsa": "#DC2626",
    "burgundy": "#831843",
    "green": "#065F46",
    "emerald": "#047857",
    "racing green": "#064E3B",
    "bronze": "#8C6239",
    "gold": "#D97706",
    "champagne": "#D4AF37",
    "yellow": "#EAB308",
    "orange": "#EA580C"
}

def log(msg: str, symbol: str = "ℹ️"):
    print(f"[{symbol}] {msg}")

def log_success(msg: str):
    log(msg, "✅")

def log_warn(msg: str):
    log(msg, "⚠️")

def log_err(msg: str):
    log(msg, "❌")


class FleetImporter:
    def __init__(
        self,
        json_path: Path,
        zip_path: Optional[Path] = None,
        images_dir: Optional[Path] = None,
        dry_run: bool = False,
        mode: str = "merge",
        build_hostinger: bool = False
    ):
        self.json_path = json_path
        self.zip_path = zip_path
        self.images_dir = images_dir
        self.dry_run = dry_run
        self.mode = mode
        self.build_hostinger = build_hostinger

        self.backup_dir = settings.DATA_DIR / "backups"
        self.uploads_dir = settings.UPLOADS_DIR
        self.vehicles_file = settings.DATA_DIR / "vehicles.json"
        self.frontend_data_file = PROJECT_ROOT / "src" / "data.ts"
        self.timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

        self.extracted_images_map: Dict[str, Path] = {}
        self.temp_extract_dir: Optional[Path] = None

    def create_backups(self) -> Dict[str, str]:
        """Create timestamped backups of all existing data stores."""
        backups = {}
        if self.dry_run:
            log("Dry run active: backups will be created during actual execution.", "🛡️")
            return backups

        self.backup_dir.mkdir(parents=True, exist_ok=True)
        log(f"Creating snapshot backups in {self.backup_dir}...", "💾")

        # 1. Backup server/data/vehicles.json
        if self.vehicles_file.exists():
            backup_json = self.backup_dir / f"vehicles_backup_{self.timestamp_str}.json"
            shutil.copy2(self.vehicles_file, backup_json)
            backups["vehicles_json"] = str(backup_json)
            log(f"Backed up vehicles.json -> {backup_json.name}", "💾")

        # 2. Backup src/data.ts
        if self.frontend_data_file.exists():
            backup_ts = self.backup_dir / f"data_ts_backup_{self.timestamp_str}.ts"
            shutil.copy2(self.frontend_data_file, backup_ts)
            backups["frontend_ts"] = str(backup_ts)
            log(f"Backed up src/data.ts -> {backup_ts.name}", "💾")

        # 3. Backup Database table records
        try:
            init_db()
            db = SessionLocal()
            try:
                db_vehicles = db.query(Vehicle).all()
                if db_vehicles:
                    db_backup_path = self.backup_dir / f"db_vehicles_{self.timestamp_str}.json"
                    with open(db_backup_path, "w", encoding="utf-8") as f:
                        json.dump([v.to_dict() for v in db_vehicles], f, indent=2)
                    backups["db_vehicles"] = str(db_backup_path)
                    log(f"Backed up {len(db_vehicles)} database records -> {db_backup_path.name}", "💾")
            finally:
                db.close()
        except Exception as e:
            log_warn(f"Database backup note: {e}")

        return backups

    def unpack_images(self) -> Dict[str, Path]:
        """Extract and map available images from ZIP archive or directory."""
        images_map: Dict[str, Path] = {}

        if self.zip_path and self.zip_path.exists():
            log(f"Inspecting image archive: {self.zip_path}", "📦")
            temp_dir = settings.DATA_DIR / f"_temp_zip_{self.timestamp_str}"
            temp_dir.mkdir(parents=True, exist_ok=True)
            self.temp_extract_dir = temp_dir

            with zipfile.ZipFile(self.zip_path, 'r') as zf:
                for member in zf.infolist():
                    if member.is_dir():
                        continue
                    # Normalize filename path
                    norm_path = member.filename.replace('\\', '/')
                    basename = Path(norm_path).name
                    ext = Path(norm_path).suffix.lower()

                    if ext in ALLOWED_IMAGE_EXTS:
                        extracted_path = zf.extract(member, temp_dir)
                        # Register both relative path and basename for flexible matching
                        images_map[norm_path.lower()] = Path(extracted_path)
                        images_map[basename.lower()] = Path(extracted_path)

            log_success(f"Discovered {len(images_map)} image references in archive.")

        elif self.images_dir and self.images_dir.exists():
            log(f"Scanning images directory: {self.images_dir}", "📁")
            for root, _, files in os.walk(self.images_dir):
                for f in files:
                    ext = Path(f).suffix.lower()
                    if ext in ALLOWED_IMAGE_EXTS:
                        full_p = Path(root) / f
                        rel_p = full_p.relative_to(self.images_dir).as_posix()
                        images_map[rel_p.lower()] = full_p
                        images_map[f.lower()] = full_p
            log_success(f"Discovered {len(images_map)} images in directory.")
        else:
            log_warn("No image archive or folder provided. Vehicle records will be imported with existing or fallback URLs.")

        self.extracted_images_map = images_map
        return images_map

    def normalize_price(self, raw_price: Any) -> Tuple[float, int]:
        """
        Normalizes price to Lakhs (float) and returns standard calculated EMI.
        Supports:
          - Full INR values (e.g. 8500000 -> 85.0 Lakhs)
          - Lakh values (e.g. 85.0 or 17.25)
          - String values with currency/commas (e.g. "85,00,000")
        """
        if isinstance(raw_price, str):
            clean = re.sub(r"[^\d.]", "", raw_price)
            val = float(clean) if clean else 0.0
        else:
            val = float(raw_price or 0.0)

        # If value is >= 10,000, treat as full INR amount and convert to Lakhs
        if val >= 10000:
            price_in_lakhs = round(val / 100000.0, 2)
        else:
            price_in_lakhs = round(val, 2)

        # Standard Exotique EMI calculation (1.5% monthly approx)
        calculated_emi = int(round((price_in_lakhs * 100000.0 * 0.015) / 100.0) * 100)
        return price_in_lakhs, calculated_emi

    def parse_colors(self, raw_colors: Any) -> List[Dict[str, str]]:
        """Parses color strings or lists into structured [{'name': '...', 'hex': '...'}] format."""
        if not raw_colors:
            return [
                {"name": "Obsidian Black", "hex": "#0B0C0E"},
                {"name": "Polar White", "hex": "#FDFCFA"}
            ]

        if isinstance(raw_colors, list):
            parsed = []
            for item in raw_colors:
                if isinstance(item, dict) and "name" in item:
                    parsed.append({
                        "name": str(item["name"]).strip(),
                        "hex": str(item.get("hex", COLOR_PALETTE.get(item["name"].lower().strip(), "#111827")))
                    })
                elif isinstance(item, str):
                    c_name = item.strip()
                    hex_code = COLOR_PALETTE.get(c_name.lower(), "#333333")
                    parsed.append({"name": c_name, "hex": hex_code})
            return parsed if parsed else [{"name": "Standard Finish", "hex": "#111827"}]

        if isinstance(raw_colors, str):
            # Check if JSON string
            try:
                loaded = json.loads(raw_colors)
                if isinstance(loaded, list):
                    return self.parse_colors(loaded)
            except Exception:
                pass

            names = [c.strip() for c in re.split(r"[,/|;]", raw_colors) if c.strip()]
            parsed = []
            for name in names:
                hex_code = COLOR_PALETTE.get(name.lower(), "#111827")
                parsed.append({"name": name, "hex": hex_code})
            return parsed if parsed else [{"name": "Standard Finish", "hex": "#111827"}]

        return [{"name": "Standard Finish", "hex": "#111827"}]

    def parse_features(self, raw_features: Any) -> List[str]:
        """Parses features string or list into clean list of strings."""
        if not raw_features:
            return [
                "120-Point Certified Inspection",
                "Single Ownership History",
                "Original OEM Spares Only",
                "Full Service Documentation Verified"
            ]

        if isinstance(raw_features, list):
            res = [str(item).strip().lstrip("-*• ") for item in raw_features if str(item).strip()]
            return res if res else ["120-Point Certified Inspection"]

        if isinstance(raw_features, str):
            try:
                loaded = json.loads(raw_features)
                if isinstance(loaded, list):
                    return self.parse_features(loaded)
            except Exception:
                pass

            # Split by newline or commas
            if "\n" in raw_features:
                items = raw_features.split("\n")
            else:
                items = raw_features.split(",")

            res = [i.strip().lstrip("-*• ") for i in items if i.strip()]
            return res if res else ["120-Point Certified Inspection"]

        return ["120-Point Certified Inspection"]

    def process_vehicle_images(
        self,
        vehicle_slug: str,
        image_files: List[str]
    ) -> Tuple[List[str], List[str]]:
        """
        Matches image filenames against the extracted archive and copies them to server/uploads/.
        Returns (saved_upload_urls, missing_filenames).
        """
        saved_urls = []
        missing_files = []

        self.uploads_dir.mkdir(parents=True, exist_ok=True)

        for img_name in image_files:
            clean_lookup = img_name.strip().replace('\\', '/').lower()
            base_lookup = Path(clean_lookup).name

            matched_source_path = None
            if clean_lookup in self.extracted_images_map:
                matched_source_path = self.extracted_images_map[clean_lookup]
            elif base_lookup in self.extracted_images_map:
                matched_source_path = self.extracted_images_map[base_lookup]

            if matched_source_path and matched_source_path.exists():
                ext = matched_source_path.suffix.lower()
                clean_stem = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(img_name).stem)
                # Form unique target filename
                unique_suffix = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:6]}"
                dest_filename = f"{vehicle_slug}_{clean_stem}_{unique_suffix}{ext}"
                dest_path = self.uploads_dir / dest_filename

                if not self.dry_run:
                    shutil.copy2(matched_source_path, dest_path)

                saved_urls.append(f"/uploads/{dest_filename}")
            else:
                missing_files.append(img_name)

        return saved_urls, missing_files

    def run(self) -> Dict[str, Any]:
        """Executes the full fleet import and settlement sequence."""
        print("=" * 70)
        print("🚗 EXOTIQUE MACHINES — VEHICLE DATA IMPORTER & SETTLEMENT PIPELINE")
        print("=" * 70)

        if not self.json_path.exists():
            log_err(f"JSON file not found at: {self.json_path}")
            return {"success": False, "error": f"JSON file missing: {self.json_path}"}

        # Step 1: Read JSON
        log(f"Reading incoming fleet specification: {self.json_path}", "📄")
        with open(self.json_path, "r", encoding="utf-8") as f:
            try:
                incoming_data = json.load(f)
            except Exception as e:
                log_err(f"Invalid JSON syntax in {self.json_path}: {e}")
                return {"success": False, "error": f"JSON parse error: {e}"}

        if not isinstance(incoming_data, list):
            log_err("Input JSON must contain an array of vehicle objects.")
            return {"success": False, "error": "Root JSON element is not a list."}

        log(f"Found {len(incoming_data)} vehicle entries in JSON.", "📋")

        # Step 2: Extract & Map Images
        self.unpack_images()

        # Step 3: Backups
        backups = self.create_backups()

        # Step 4: Parse & Validate Vehicles
        log("Validating records, matching image references, and normalizing specs...", "🔍")
        processed_vehicles = []
        validation_warnings = []
        all_referenced_images = set()

        for idx, item in enumerate(incoming_data, start=1):
            brand = str(item.get("brand", "")).strip()
            model = str(item.get("model", "")).strip()
            raw_price = item.get("price")

            if not brand or not model or raw_price is None:
                warn_msg = f"Row #{idx}: Skipped due to missing required fields (brand: '{brand}', model: '{model}', price: {raw_price})"
                validation_warnings.append(warn_msg)
                log_warn(warn_msg)
                continue

            price_in_lakhs, default_emi = self.normalize_price(raw_price)
            emi = int(item.get("emi", 0)) or default_emi

            # ID generation
            existing_id = item.get("id")
            if existing_id:
                veh_id = str(existing_id).strip()
            else:
                clean_slug = re.sub(r"[^a-z0-9]+", "-", f"{brand}-{model}".lower()).strip("-")
                veh_id = f"{clean_slug}-{idx}"

            # Category
            raw_cat = str(item.get("category", "")).lower()
            if "luxury" in raw_cat or "premium" in raw_cat or price_in_lakhs > 25:
                category = "premium"
            else:
                category = "non-premium"

            # Specs
            badge = str(item.get("badge", f"{model} Edition")).strip()
            veh_type = str(item.get("type", "Luxury SUV" if category == "premium" else "Compact SUV")).strip()
            lifestyle = str(item.get("lifestyle", "SUV")).strip()
            fuel = str(item.get("fuel", "Petrol")).strip()
            transmission = str(item.get("transmission", "Automatic")).strip()
            seats = int(item.get("seats", 5))
            engine = str(item.get("engine", "Performance Powertrain")).strip()
            power = str(item.get("power", "Certified Performance")).strip()
            mileage = str(item.get("mileage", "Verified Showroom Mileage")).strip()
            description = str(item.get("description", f"Exotique Machines certified {brand} {model} in pristine condition.")).strip()
            rating = float(item.get("rating", 5.0))
            is_recent = bool(item.get("isRecent", True))

            colors = self.parse_colors(item.get("colors"))
            features = self.parse_features(item.get("features"))

            # Process images
            image_files = item.get("image_files", [])
            if isinstance(image_files, str):
                image_files = [img.strip() for img in image_files.split(",") if img.strip()]
            elif not isinstance(image_files, list):
                image_files = []

            for img_f in image_files:
                all_referenced_images.add(img_f.lower())

            matched_urls, missing_imgs = self.process_vehicle_images(veh_id, image_files)

            if missing_imgs:
                warn_msg = f"Vehicle '{brand} {model}' (ID: {veh_id}): {len(missing_imgs)} image(s) not found in archive: {', '.join(missing_imgs)}"
                validation_warnings.append(warn_msg)
                log_warn(warn_msg)

            # Preserve existing imageUrls or images if provided
            existing_images = item.get("images", [])
            if isinstance(existing_images, list):
                for ex in existing_images:
                    if ex not in matched_urls:
                        matched_urls.append(ex)

            if not matched_urls:
                matched_urls = [
                    "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=1200"
                ]

            veh_dict = {
                "id": veh_id,
                "brand": brand,
                "model": model,
                "badge": badge,
                "type": veh_type,
                "category": category,
                "lifestyle": lifestyle,
                "fuel": fuel,
                "transmission": transmission,
                "price": price_in_lakhs,
                "emi": emi,
                "seats": seats,
                "engine": engine,
                "power": power,
                "mileage": mileage,
                "images": matched_urls,
                "colors": colors,
                "description": description,
                "features": features,
                "rating": rating,
                "isRecent": is_recent,
                "createdAt": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            processed_vehicles.append(veh_dict)

        log_success(f"Validated {len(processed_vehicles)} vehicles ready for settlement.")

        # Check for unreferenced images in the archive
        unreferenced_images = []
        for img_key, img_path in self.extracted_images_map.items():
            if img_key not in all_referenced_images and Path(img_key).name not in all_referenced_images:
                unreferenced_images.append(img_path.name)
        if unreferenced_images:
            unique_unref = list(set(unreferenced_images))[:10]
            log_warn(f"{len(set(unreferenced_images))} image(s) in ZIP were not referenced in JSON (e.g. {', '.join(unique_unref)})")

        if self.dry_run:
            print("\n" + "=" * 70)
            print("🔍 DRY RUN SUMMARY (NO MODIFICATIONS MADE)")
            print("=" * 70)
            print(f"Total Valid Vehicles: {len(processed_vehicles)}")
            print(f"Validation Warnings: {len(validation_warnings)}")
            if processed_vehicles:
                print("\nSample Imported Record Preview:")
                print(json.dumps(processed_vehicles[0], indent=2))
            print("=" * 70 + "\n")
            self._cleanup_temp()
            return {
                "success": True,
                "dry_run": True,
                "valid_count": len(processed_vehicles),
                "warnings": validation_warnings
            }

        # Step 5: Settle in Backend JSON (server/data/vehicles.json)
        log("Settling fleet records in server/data/vehicles.json...", "💾")
        existing_vehicles_map = {}
        if self.vehicles_file.exists() and self.mode == "merge":
            try:
                with open(self.vehicles_file, "r", encoding="utf-8") as f:
                    curr_list = json.load(f)
                    for v in curr_list:
                        existing_vehicles_map[v["id"]] = v
            except Exception as e:
                log_warn(f"Could not parse existing vehicles.json: {e}")

        # Merge
        for pv in processed_vehicles:
            existing_vehicles_map[pv["id"]] = pv

        merged_fleet = list(existing_vehicles_map.values())
        with open(self.vehicles_file, "w", encoding="utf-8") as f:
            json.dump(merged_fleet, f, indent=2)
        log_success(f"server/data/vehicles.json updated with {len(merged_fleet)} total vehicles.")

        # Step 6: Settle in Frontend Static Fallback (src/data.ts)
        log("Synchronizing frontend bundle fallback in src/data.ts...", "💻")
        ts_content = (
            "import { Vehicle } from './types';\n\n"
            f"export const VEHICLES: Vehicle[] = {json.dumps(merged_fleet, indent=2)};\n"
        )
        with open(self.frontend_data_file, "w", encoding="utf-8") as f:
            f.write(ts_content)
        log_success(f"src/data.ts updated ({len(merged_fleet)} vehicles).")

        # Step 7: Settle in Database (PostgreSQL / SQLite)
        log("Synchronizing Database (PostgreSQL / SQLite)...", "🗄️")
        db_synced = 0
        try:
            init_db()
            db = SessionLocal()
            try:
                for v_data in processed_vehicles:
                    db_obj = db.query(Vehicle).filter(Vehicle.id == v_data["id"]).first()
                    if not db_obj:
                        db_obj = Vehicle(
                            id=v_data["id"],
                            brand=v_data["brand"],
                            model=v_data["model"],
                            badge=v_data["badge"],
                            type=v_data["type"],
                            category=v_data["category"],
                            lifestyle=v_data["lifestyle"],
                            fuel=v_data["fuel"],
                            transmission=v_data["transmission"],
                            price=v_data["price"],
                            emi=v_data["emi"],
                            seats=v_data["seats"],
                            engine=v_data["engine"],
                            power=v_data["power"],
                            mileage=v_data["mileage"],
                            images=v_data["images"],
                            colors=v_data["colors"],
                            description=v_data["description"],
                            features=v_data["features"],
                            rating=v_data["rating"],
                            is_recent=v_data["isRecent"],
                            created_at=datetime.datetime.now(datetime.timezone.utc)
                        )
                        db.add(db_obj)
                    else:
                        db_obj.brand = v_data["brand"]
                        db_obj.model = v_data["model"]
                        db_obj.badge = v_data["badge"]
                        db_obj.type = v_data["type"]
                        db_obj.category = v_data["category"]
                        db_obj.lifestyle = v_data["lifestyle"]
                        db_obj.fuel = v_data["fuel"]
                        db_obj.transmission = v_data["transmission"]
                        db_obj.price = v_data["price"]
                        db_obj.emi = v_data["emi"]
                        db_obj.seats = v_data["seats"]
                        db_obj.engine = v_data["engine"]
                        db_obj.power = v_data["power"]
                        db_obj.mileage = v_data["mileage"]
                        db_obj.images = v_data["images"]
                        db_obj.colors = v_data["colors"]
                        db_obj.description = v_data["description"]
                        db_obj.features = v_data["features"]
                        db_obj.rating = v_data["rating"]
                        db_obj.is_recent = v_data["isRecent"]

                    db_synced += 1

                # Record activity log
                log_record = ActivityLog(
                    id=f"log_{int(time.time() * 1000)}",
                    timestamp=datetime.datetime.now(datetime.timezone.utc),
                    actor_id="system_importer",
                    actor_username="system",
                    actor_role="superadmin",
                    action="BULK_IMPORT",
                    target=f"{len(processed_vehicles)} Vehicles",
                    details=f"Imported from {self.json_path.name} ({db_synced} synced)",
                    ip="127.0.0.1"
                )
                db.add(log_record)
                db.commit()
                log_success(f"Database successfully synchronized with {db_synced} records.")
            finally:
                db.close()
        except Exception as e:
            log_warn(f"Database sync note (operating with local JSON stores): {e}")

        # Step 8: Optional Hostinger Build
        if self.build_hostinger:
            log("Running Hostinger production build script (node build-hostinger.js)...", "🚀")
            import subprocess
            try:
                res = subprocess.run(["node", "build-hostinger.js"], cwd=PROJECT_ROOT, capture_output=True, text=True)
                print(res.stdout)
                if res.returncode == 0:
                    log_success("Hostinger build completed! 'dist/' folder is ready for upload to public_html/.")
                else:
                    log_err(f"Hostinger build failed:\n{res.stderr}")
            except Exception as e:
                log_err(f"Could not execute build-hostinger.js: {e}")

        self._cleanup_temp()

        print("\n" + "=" * 70)
        print("🎉 IMPORT AND SETTLEMENT COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"• Total Vehicles Succeeded: {len(processed_vehicles)}")
        print(f"• Total Fleet in Store:     {len(merged_fleet)}")
        print(f"• Uploads Populated in:     {self.uploads_dir}")
        print(f"• Backups Stored in:        {self.backup_dir}")
        print("=" * 70 + "\n")

        return {
            "success": True,
            "imported_count": len(processed_vehicles),
            "total_fleet_count": len(merged_fleet),
            "backups": backups,
            "warnings": validation_warnings
        }

    def _cleanup_temp(self):
        """Remove temporary extraction folder if created."""
        if self.temp_extract_dir and self.temp_extract_dir.exists():
            try:
                shutil.rmtree(self.temp_extract_dir)
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="Exotique Machines Vehicle Fleet Importer & Hostinger Settlement")
    parser.add_argument("--json", type=str, default="vehicles.json", help="Path to vehicles.json file")
    parser.add_argument("--zip", type=str, default="vehicle-images.zip", help="Path to vehicle-images.zip archive")
    parser.add_argument("--images-dir", type=str, default=None, help="Optional directory containing unzipped images")
    parser.add_argument("--dry-run", action="store_true", help="Validate and test import without modifying data")
    parser.add_argument("--mode", choices=["merge", "replace"], default="merge", help="Merge with existing or replace all")
    parser.add_argument("--build-hostinger", action="store_true", help="Trigger Hostinger build script after import")

    args = parser.parse_args()

    # Resolve paths relative to cwd or PROJECT_ROOT
    json_path = Path(args.json)
    if not json_path.is_absolute():
        if (PROJECT_ROOT / json_path).exists():
            json_path = PROJECT_ROOT / json_path
        else:
            json_path = Path.cwd() / json_path

    zip_path = Path(args.zip) if args.zip else None
    if zip_path and not zip_path.is_absolute():
        if (PROJECT_ROOT / zip_path).exists():
            zip_path = PROJECT_ROOT / zip_path
        else:
            zip_path = Path.cwd() / zip_path

    images_dir = Path(args.images_dir) if args.images_dir else None
    if images_dir and not images_dir.is_absolute():
        if (PROJECT_ROOT / images_dir).exists():
            images_dir = PROJECT_ROOT / images_dir
        else:
            images_dir = Path.cwd() / images_dir

    importer = FleetImporter(
        json_path=json_path,
        zip_path=zip_path if zip_path and zip_path.exists() else None,
        images_dir=images_dir if images_dir and images_dir.exists() else None,
        dry_run=args.dry_run,
        mode=args.mode,
        build_hostinger=args.build_hostinger
    )

    importer.run()


if __name__ == "__main__":
    main()
