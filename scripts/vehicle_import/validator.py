"""
Data Validation System for Exotique Vehicle Import.
Performs pre-import static analysis, schema compliance, duplicate detection,
and image reference reconciliation.
"""

import re
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from scripts.vehicle_import.config import config
from scripts.vehicle_import.logger import logger
from scripts.vehicle_import.image_handler import ImageHandler

# Standard automotive color mapping for standard finish codes
COMMON_COLOR_HEX = {
    "black": "#0B0C0E",
    "obsidian black": "#0B0C0E",
    "carbon black": "#1A1A1E",
    "white": "#FDFCFA",
    "polar white": "#FDFCFA",
    "alpine white": "#FDFCFA",
    "blue": "#1E3A8A",
    "phytonic blue": "#1E3A8A",
    "silver": "#D1D5DB",
    "glacier silver": "#D1D5DB",
    "grey": "#4B5563",
    "gray": "#4B5563",
    "red": "#B91C1C",
    "green": "#166534",
    "pangea green": "#2D3B36",
    "bronze": "#8C6239",
    "gold": "#D97706"
}

@dataclass
class ValidationReport:
    total_vehicles: int = 0
    valid_vehicles: List[Dict[str, Any]] = field(default_factory=list)
    invalid_vehicles: List[Tuple[Dict[str, Any], List[str]]] = field(default_factory=list)
    duplicate_candidates: List[Tuple[Dict[str, Any], str]] = field(default_factory=list)
    records_needing_correction: List[Tuple[Dict[str, Any], List[str]]] = field(default_factory=list)

    total_images_in_archive: int = 0
    matched_images: Set[str] = field(default_factory=set)
    missing_images: Dict[str, List[str]] = field(default_factory=dict)  # vehicle -> missing files
    unused_images: Set[str] = field(default_factory=set)
    corrupted_images: List[Tuple[str, str]] = field(default_factory=list)

    @property
    def is_valid_for_import(self) -> bool:
        return (
            len(self.invalid_vehicles) == 0
            and len(self.duplicate_candidates) == 0
            and len(self.records_needing_correction) == 0
            and len(self.corrupted_images) == 0
            and len(self.valid_vehicles) > 0
        )

    def generate_summary(self) -> str:
        status_str = "READY FOR PRODUCTION IMPORT" if self.is_valid_for_import else "REVIEW REQUIRED"
        lines = [
            "=" * 60,
            "EXOTIQUE VEHICLE IMPORT — VALIDATION REPORT",
            "=" * 60,
            f"Total vehicle records found:       {self.total_vehicles}",
            f"Valid vehicle records:             {len(self.valid_vehicles)}",
            f"Invalid vehicle records:           {len(self.invalid_vehicles)}",
            f"Duplicate candidates prevented:    {len(self.duplicate_candidates)}",
            f"Records needing manual correction: {len(self.records_needing_correction)}",
            "-" * 60,
            f"Total images in archive:           {self.total_images_in_archive}",
            f"Matched images:                    {len(self.matched_images)}",
            f"Missing images:                    {sum(len(v) for v in self.missing_images.values())}",
            f"Unused images:                     {len(self.unused_images)}",
            f"Corrupted/invalid images:          {len(self.corrupted_images)}",
            "-" * 60,
            f"Validation Status:                 {status_str}",
            "=" * 60,
        ]

        if self.invalid_vehicles:
            lines.append("\n[!] INVALID VEHICLE RECORDS (Must be fixed):")
            for v, reasons in self.invalid_vehicles:
                label = f"{v.get('brand', 'Unknown')} {v.get('model', 'Unknown')}"
                lines.append(f"  * {label}:")
                for r in reasons:
                    lines.append(f"      - {r}")

        if self.duplicate_candidates:
            lines.append("\n[!] DUPLICATE CANDIDATES (Prevented from duplicate creation):")
            for v, dup_reason in self.duplicate_candidates:
                label = f"{v.get('brand', 'Unknown')} {v.get('model', 'Unknown')}"
                lines.append(f"  * {label}: {dup_reason}")

        if self.records_needing_correction:
            lines.append("\n[!] RECORDS NEEDING MANUAL CORRECTION (Missing Image Assets):")
            for v, missing in self.records_needing_correction:
                label = f"{v.get('brand', 'Unknown')} {v.get('model', 'Unknown')}"
                lines.append(f"  * {label}: Missing images {missing}")

        if self.unused_images:
            lines.append("\n[*] UNUSED IMAGES IN ARCHIVE (will be skipped safely):")
            for img in sorted(self.unused_images):
                lines.append(f"  * {img}")

        if self.corrupted_images:
            lines.append("\n[!] CORRUPTED / UNSUPPORTED IMAGE FILES:")
            for img, err in self.corrupted_images:
                lines.append(f"  * {img}: {err}")

        return "\n".join(lines)


class DataValidator:
    def __init__(self, existing_vehicle_ids: Optional[Set[str]] = None):
        self.existing_vehicle_ids = existing_vehicle_ids or set()

    @staticmethod
    def normalize_slug(brand: str, model: str) -> str:
        clean = re.sub(r"[^a-z0-9]+", "-", f"{brand.strip()}-{model.strip()}".lower()).strip("-")
        return clean

    @staticmethod
    def parse_colors(raw_colors: Any) -> List[Dict[str, str]]:
        """Normalize colors into a list of dicts with name and hex."""
        if not raw_colors:
            return [{"name": "Standard Showroom Finish", "hex": "#111111"}]

        if isinstance(raw_colors, list):
            result = []
            for item in raw_colors:
                if isinstance(item, dict) and "name" in item:
                    hex_code = item.get("hex") or COMMON_COLOR_HEX.get(item["name"].lower().strip(), "#111111")
                    result.append({"name": item["name"], "hex": hex_code})
                elif isinstance(item, str):
                    c_name = item.strip()
                    hex_code = COMMON_COLOR_HEX.get(c_name.lower(), "#111111")
                    result.append({"name": c_name, "hex": hex_code})
            return result or [{"name": "Standard Showroom Finish", "hex": "#111111"}]

        if isinstance(raw_colors, str):
            result = []
            for c in raw_colors.split(","):
                c_clean = c.strip()
                if c_clean:
                    hex_code = COMMON_COLOR_HEX.get(c_clean.lower(), "#111111")
                    result.append({"name": c_clean, "hex": hex_code})
            return result or [{"name": "Standard Showroom Finish", "hex": "#111111"}]

        return [{"name": "Standard Showroom Finish", "hex": "#111111"}]

    @staticmethod
    def parse_features(raw_features: Any) -> List[str]:
        """Normalize features into a list of strings."""
        if not raw_features:
            return ["120-Point Certified Inspection", "Single Ownership History", "Original OEM Spares Only"]
        if isinstance(raw_features, list):
            return [str(f).strip() for f in raw_features if str(f).strip()]
        if isinstance(raw_features, str):
            if "," in raw_features:
                return [f.strip() for f in raw_features.split(",") if f.strip()]
            return [f.strip() for f in raw_features.split("\n") if f.strip()]
        return ["120-Point Certified Inspection"]

    def validate(
        self,
        vehicles_raw: List[Dict[str, Any]],
        image_handler: ImageHandler
    ) -> ValidationReport:
        """
        Validate all vehicle objects and cross-check against extracted image archive.
        """
        report = ValidationReport()
        report.total_vehicles = len(vehicles_raw)

        # 1. Validate images extracted in the archive
        extracted_files = image_handler.extracted_files
        report.total_images_in_archive = len(extracted_files)
        valid_archive_images = set()

        for filename, path in extracted_files.items():
            is_valid, msg = ImageHandler.validate_image_file(path)
            if not is_valid:
                report.corrupted_images.append((filename, msg))
            else:
                valid_archive_images.add(filename)

        all_referenced_images = set()
        seen_batch_slugs: Dict[str, int] = {}

        # 2. Validate individual vehicle records
        for idx, v in enumerate(vehicles_raw, start=1):
            reasons = []

            # Brand validation
            brand = str(v.get("brand", "")).strip()
            if not brand:
                reasons.append("Missing required field 'brand'")

            # Model validation
            model = str(v.get("model", "")).strip()
            if not model:
                reasons.append("Missing required field 'model'")

            # Price validation
            price_val = v.get("price")
            if price_val is None:
                reasons.append("Missing required field 'price'")
            else:
                try:
                    price_float = float(price_val)
                    if price_float <= 0:
                        reasons.append(f"Price must be a positive numeric value, received {price_float}")
                except (ValueError, TypeError):
                    reasons.append(f"Invalid price value '{price_val}' (must be numeric)")

            # Normalize Price: Detect if raw INR (e.g. 8500000) or Lakhs (85.0)
            normalized_price = 0.0
            if "price" in v and not any("Price" in r for r in reasons):
                raw_p = float(v["price"])
                if raw_p >= 100000:
                    normalized_price = round(raw_p / 100000.0, 2)
                else:
                    normalized_price = round(raw_p, 2)

            # Check Duplicates (both against existing DB and in current batch)
            slug = self.normalize_slug(brand or "unknown", model or f"record-{idx}")
            is_duplicate = False
            dup_reason = ""
            if slug in seen_batch_slugs:
                is_duplicate = True
                dup_reason = f"Duplicate of earlier batch record #{seen_batch_slugs[slug]} (slug: {slug})"
                report.duplicate_candidates.append((v, dup_reason))
            elif slug in self.existing_vehicle_ids:
                is_duplicate = True
                dup_reason = f"Vehicle slug '{slug}' already exists in production database"
                report.duplicate_candidates.append((v, dup_reason))
            else:
                seen_batch_slugs[slug] = idx

            # Image references check
            img_files = v.get("image_files", [])
            veh_label = f"{brand} {model}" if (brand and model) else f"Record #{idx}"
            missing_for_veh = []

            for img_name in img_files:
                all_referenced_images.add(img_name)
                if img_name not in valid_archive_images:
                    missing_for_veh.append(img_name)
                else:
                    report.matched_images.add(img_name)

            if missing_for_veh:
                report.missing_images[veh_label] = missing_for_veh

            # Categorize Record cleanly
            if reasons:
                report.invalid_vehicles.append((v, reasons))
            elif is_duplicate:
                # Handled in duplicate_candidates, do not queue for import
                pass
            elif missing_for_veh:
                # Put in records needing manual correction
                report.records_needing_correction.append((v, missing_for_veh))
            else:
                # Prepare cleanly mapped payload
                mapped_vehicle = {
                    "source_index": idx,
                    "slug": slug,
                    "brand": brand,
                    "model": model,
                    "price": normalized_price,
                    "badge": str(v.get("badge", f"{model} Edition")).strip(),
                    "type": str(v.get("type", "Luxury SUV")).strip(),
                    "category": "premium" if ("luxury" in str(v.get("category", "")).lower() or "premium" in str(v.get("category", "")).lower() or normalized_price > 25) else "non-premium",
                    "lifestyle": str(v.get("lifestyle", "SUV")).strip(),
                    "fuel": str(v.get("fuel", "Petrol")).strip(),
                    "transmission": str(v.get("transmission", "Automatic")).strip(),
                    "emi": int(v.get("emi", round((normalized_price * 100000 * 0.015) / 100) * 100)),
                    "seats": int(v.get("seats", 5)),
                    "engine": str(v.get("engine", "Performance Powertrain")).strip(),
                    "power": str(v.get("power", "Certified Performance")).strip(),
                    "mileage": str(v.get("mileage", "Verified Showroom Mileage")).strip(),
                    "description": str(v.get("description", f"Exotique Machines certified {brand} {model} in pristine condition.")).strip(),
                    "features": self.parse_features(v.get("features")),
                    "colors": self.parse_colors(v.get("colors")),
                    "rating": float(v.get("rating", 5.0)),
                    "image_files": [f for f in img_files if f in valid_archive_images]
                }
                report.valid_vehicles.append(mapped_vehicle)

        # 3. Find unused images in archive
        report.unused_images = valid_archive_images - all_referenced_images

        return report
