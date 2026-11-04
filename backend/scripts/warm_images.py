"""Pre-generate WebP/AVIF variants for every image already in /uploads.

    python -m backend.scripts.warm_images             # report + generate variants
    python -m backend.scripts.warm_images --dry-run   # report only
    python -m backend.scripts.warm_images --sanitize-legacy

* Never modifies or deletes an existing upload by default.
* Before anything else, each legacy upload is copied byte-for-byte to the private
  originals folder (if not already there), so the untouched file is always kept.
* --sanitize-legacy additionally rewrites the public copy in /uploads without EXIF/GPS
  metadata (quality 92, same pixel size, colour profile kept). Only run it after the
  originals copy has been verified; the script refuses to rewrite a file whose
  preserved copy is missing or differs in size.
"""
import argparse
import io
import json
import shutil
import sys
import time

from PIL import Image, ImageOps

from backend.cms.images import SAFE_NAME_RE, generate_all_variants, AVIF_AVAILABLE
from backend.config import settings

IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")


def has_location(path) -> bool:
    try:
        with Image.open(path) as im:
            return bool(im.getexif().get_ifd(0x8825))
    except Exception:
        return False


def preserve(src) -> bool:
    dest = settings.originals_dir / src.name
    if dest.exists():
        return False
    shutil.copy2(src, dest)
    return True


def sanitize(src) -> int:
    original = settings.originals_dir / src.name
    if not original.exists() or original.stat().st_size != src.stat().st_size:
        raise RuntimeError(f"{src.name}: preserved original missing or different — not rewriting")
    with Image.open(src) as im:
        fmt = im.format
        icc = im.info.get("icc_profile")
        clean = ImageOps.exif_transpose(im)
        out = io.BytesIO()
        if fmt == "JPEG":
            clean.convert("RGB").save(out, "JPEG", quality=92, optimize=True, progressive=True, icc_profile=icc)
        elif fmt == "PNG":
            clean.save(out, "PNG", optimize=True, icc_profile=icc)
        else:
            clean.save(out, "WEBP", quality=92, method=5, icc_profile=icc)
    tmp = src.with_name(src.name + ".tmp")
    tmp.write_bytes(out.getvalue())
    tmp.replace(src)
    return len(out.getvalue())


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sanitize-legacy", action="store_true")
    args = ap.parse_args(argv)

    files = sorted(p for p in settings.UPLOADS_DIR.iterdir()
                   if p.is_file() and p.suffix.lower() in IMAGE_EXT and SAFE_NAME_RE.match(p.name))
    report = {"files": len(files), "bytes": sum(p.stat().st_size for p in files), "with_gps": 0,
              "preserved_now": 0, "sanitized": 0, "variants_ms": 0.0, "avif": AVIF_AVAILABLE, "errors": []}
    t0 = time.perf_counter()
    for p in files:
        gps = has_location(p)
        report["with_gps"] += gps
        if args.dry_run:
            continue
        try:
            report["preserved_now"] += preserve(p)
            if args.sanitize_legacy and gps:
                sanitize(p)
                report["sanitized"] += 1
            report["variants_ms"] += generate_all_variants(p.name)["total"]
        except Exception as e:  # keep going; report at the end
            report["errors"].append(f"{p.name}: {e}")
    report["elapsed_s"] = round(time.perf_counter() - t0, 1)
    report["variants_ms"] = round(report["variants_ms"])
    print(json.dumps(report, indent=2))
    return 1 if report["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
