"""
Safe image extraction, format validation, and integrity verification.
Protects strictly against Zip Slip (path traversal) and corrupted files.
"""

import os
import zipfile
import hashlib
from pathlib import Path
from typing import Dict, List, Set, Tuple
from scripts.vehicle_import.config import config
from scripts.vehicle_import.logger import logger

# Binary signatures (magic bytes) for image format validation
IMAGE_MAGIC_SIGNATURES = {
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".webp": [b"RIFF"],  # also checks for WEBP at byte offset 8
}

class ImageHandler:
    def __init__(self, zip_path: Path = None, extract_dir: Path = None):
        self.zip_path = Path(zip_path or config.images_zip_path)
        self.extract_dir = Path(extract_dir or config.extract_dir)
        self.extracted_files: Dict[str, Path] = {}
        self.file_hashes: Dict[str, str] = {}

    def extract_safely(self) -> Dict[str, Path]:
        """
        Extract the ZIP archive with strict path traversal / Zip Slip protection.
        Returns a dictionary mapping base filename -> extracted absolute Path.
        """
        if not self.zip_path.exists():
            raise FileNotFoundError(f"Image ZIP archive not found at: {self.zip_path}")

        self.extract_dir.mkdir(parents=True, exist_ok=True)
        resolved_extract_dir = self.extract_dir.resolve()
        logger.info(f"Safely inspecting and extracting image archive: {self.zip_path}")

        extracted_map = {}
        with zipfile.ZipFile(self.zip_path, "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue

                # Defend against Zip Slip
                member_path = Path(member.filename)
                target_path = (self.extract_dir / member_path.name).resolve()

                # Ensure target stays strictly inside extraction dir
                if not str(target_path).startswith(str(resolved_extract_dir)):
                    raise ValueError(f"Security Alert: Path traversal attempt detected in ZIP archive: '{member.filename}'")

                # Extract file contents safely
                with zf.open(member) as source, open(target_path, "wb") as target:
                    content = source.read()
                    target.write(content)

                filename = target_path.name
                extracted_map[filename] = target_path

                # Calculate SHA256 checksum
                h = hashlib.sha256()
                h.update(target_path.read_bytes())
                self.file_hashes[filename] = h.hexdigest()

        self.extracted_files = extracted_map
        logger.info(f"Extracted {len(extracted_map)} images safely into: {self.extract_dir}")
        return extracted_map

    @staticmethod
    def validate_image_file(file_path: Path) -> Tuple[bool, str]:
        """
        Verify that the file is non-empty, within size limits, has a supported extension,
        and matches its binary magic number signature.
        """
        if not file_path.exists():
            return False, f"File does not exist: {file_path.name}"

        size = file_path.stat().st_size
        if size == 0:
            return False, f"File is empty (0 bytes): {file_path.name}"

        max_bytes = config.max_image_size_mb * 1024 * 1024
        if size > max_bytes:
            return False, f"File exceeds maximum size limit ({config.max_image_size_mb}MB): {file_path.name} ({size / (1024 * 1024):.2f}MB)"

        ext = file_path.suffix.lower()
        if ext not in config.allowed_extensions:
            return False, f"Unsupported file extension '{ext}' on {file_path.name}. Allowed: {config.allowed_extensions}"

        # Verify magic bytes
        try:
            with open(file_path, "rb") as f:
                header = f.read(12)

            expected_magics = IMAGE_MAGIC_SIGNATURES.get(ext, [])
            valid_magic = False
            for magic in expected_magics:
                if header.startswith(magic):
                    if ext == ".webp":
                        # For WebP, bytes 8-12 must be b"WEBP"
                        if len(header) >= 12 and header[8:12] == b"WEBP":
                            valid_magic = True
                    else:
                        valid_magic = True
                    break

            if not valid_magic:
                return False, f"File content does not match expected image magic bytes for {ext}: {file_path.name}"

        except Exception as e:
            return False, f"Failed reading file bytes for verification: {e}"

        return True, "Valid"

    def cleanup(self):
        """Remove extracted files when finished if desired."""
        if self.extract_dir.exists():
            for f in self.extract_dir.glob("*"):
                if f.is_file():
                    try:
                        f.unlink()
                    except Exception:
                        pass
