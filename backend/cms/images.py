"""Image ingestion, preservation and responsive variants.

Upload pipeline (store_image):
  1. Read with a hard size limit; decode with Pillow to prove it is a real JPEG/PNG/WebP
     (extension and Content-Type are ignored). SVG and everything else is rejected.
  2. Preserve the uploaded bytes untouched in ORIGINALS_DIR (outside /uploads, never
     served over HTTP) so nothing is ever lost to re-compression.
  3. Write the public master to /uploads: orientation applied, all EXIF/GPS/XMP removed,
     colour profile kept, longest side capped at MASTER_MAX_SIDE.
  4. Build a tiny blurred placeholder (data URI) for instant previews.
  5. Generate WebP and AVIF variants at every display width in a background thread, so
     the admin request returns immediately and visitors never wait for a first encode.

Variants are also generated on demand (/media/...), so images uploaded before this
pipeline existed get optimised versions without a migration.
"""
import base64
import hashlib
import io
import logging
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Callable, Dict, Iterable, Optional, Tuple

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError, features

from backend.config import settings

logger = logging.getLogger("luxura.images")
Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS

ALLOWED_FORMATS = {"JPEG": ("image/jpeg", ".jpg"), "PNG": ("image/png", ".png"), "WEBP": ("image/webp", ".webp")}
VARIANT_WIDTHS = (320, 640, 960, 1280, 1920)
PLACEHOLDER_WIDTH = 32
MASTER_MAX_SIDE = 3840
FORMATS = {"webp": ("WEBP", "image/webp"), "avif": ("AVIF", "image/avif")}
AVIF_AVAILABLE = features.check("avif")
VARIANT_DIR_NAME = "_variants"
SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,200}$")

# Quality per format and size (tuned on the showroom photos: no visible banding on paint
# or banding in dark interiors at these settings).
WEBP_QUALITY = {320: 72, 640: 74, 960: 76, 1280: 78, 1920: 80}
AVIF_QUALITY = {320: 50, 640: 52, 960: 55, 1280: 58, 1920: 60}

_locks: Dict[str, threading.Lock] = {}
_locks_guard = threading.Lock()
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="img-variants")


def _lock_for(key: str) -> threading.Lock:
    with _locks_guard:
        lock = _locks.get(key)
        if lock is None:
            if len(_locks) > 5000:
                _locks.clear()
            lock = _locks[key] = threading.Lock()
        return lock


def read_upload_limited(file: UploadFile, max_bytes: Optional[int] = None) -> bytes:
    max_bytes = max_bytes or settings.max_upload_bytes
    chunks, total = [], 0
    while True:
        chunk = file.file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(status_code=413, detail=f"File exceeds the {max_bytes // (1024 * 1024)} MB limit.")
        chunks.append(chunk)
    if total == 0:
        raise HTTPException(status_code=400, detail="Empty file.")
    return b"".join(chunks)


def _decode(data: bytes) -> Image.Image:
    try:
        probe = Image.open(io.BytesIO(data))
        if probe.format not in ALLOWED_FORMATS:
            raise HTTPException(status_code=400, detail="Only JPEG, PNG and WebP images are allowed.")
        if max(probe.size) > settings.MAX_IMAGE_SIDE:
            raise HTTPException(status_code=400, detail=f"Image is too large ({probe.size[0]}×{probe.size[1]} px).")
        probe.verify()
        img = Image.open(io.BytesIO(data))
        img.load()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError):
        raise HTTPException(status_code=400, detail="The file is not a valid JPEG, PNG or WebP image.")
    return img


def _placeholder(img: Image.Image) -> str:
    small = img.copy()
    small.thumbnail((PLACEHOLDER_WIDTH, PLACEHOLDER_WIDTH))
    if small.mode not in ("RGB", "RGBA"):
        small = small.convert("RGB")
    buf = io.BytesIO()
    small.save(buf, "WEBP", quality=40, method=4)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


class StoredImage:
    def __init__(self, url, filename, mime, width, height, size, sha256, original_path, original_bytes, placeholder):
        self.url, self.filename, self.mime_type = url, filename, mime
        self.width, self.height, self.size_bytes, self.sha256 = width, height, size, sha256
        self.original_path, self.original_bytes, self.placeholder = original_path, original_bytes, placeholder


def _atomic_write(path: Path, data: bytes):
    tmp = path.with_name(path.name + f".{uuid.uuid4().hex[:6]}.tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def store_image(file: UploadFile, min_width: int = 0) -> StoredImage:
    """Validate, preserve, sanitise and store an uploaded image under /uploads/."""
    data = read_upload_limited(file)
    img = _decode(data)
    fmt = img.format
    mime, ext = ALLOWED_FORMATS[fmt]
    img = ImageOps.exif_transpose(img)
    if min_width and img.width < min_width:
        raise HTTPException(status_code=400, detail=f"Image is too small ({img.width}px wide). Minimum width is {min_width}px.")

    stem = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(file.filename or "image").stem)[:60] or "image"
    filename = f"{stem}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}{ext}"

    # 2. preserve the original bytes exactly as uploaded (private)
    original_path = settings.originals_dir / filename
    _atomic_write(original_path, data)

    # 3. sanitised public master
    master = img
    if max(master.size) > MASTER_MAX_SIDE:
        master = master.copy()
        master.thumbnail((MASTER_MAX_SIDE, MASTER_MAX_SIDE), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    icc = img.info.get("icc_profile")
    if fmt == "JPEG":
        if master.mode not in ("RGB", "L"):
            master = master.convert("RGB")
        master.save(out, "JPEG", quality=90, optimize=True, progressive=True, icc_profile=icc)
    elif fmt == "PNG":
        master.save(out, "PNG", optimize=True, icc_profile=icc)
    else:
        master.save(out, "WEBP", quality=90, method=5, icc_profile=icc)
    clean = out.getvalue()
    target = settings.UPLOADS_DIR / filename
    _atomic_write(target, clean)

    stored = StoredImage(f"/uploads/{filename}", filename, mime, master.width, master.height, len(clean),
                         hashlib.sha256(data).hexdigest(), str(original_path), len(data), _placeholder(master))
    return stored


# --------------------------------------------------------------------------
# Variants
# --------------------------------------------------------------------------


def _safe_source(filename: str) -> Path:
    if not SAFE_NAME_RE.match(filename) or ".." in filename:
        raise HTTPException(status_code=404, detail="Not found")
    src = (settings.UPLOADS_DIR / filename).resolve()
    if src.parent != settings.UPLOADS_DIR.resolve() or not src.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    if src.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
        raise HTTPException(status_code=404, detail="Not found")
    return src


def variant_file(src: Path, width: int, fmt: str) -> Path:
    return settings.UPLOADS_DIR / VARIANT_DIR_NAME / f"w{width}" / f"{src.stem}.{fmt}"


def _fresh(dest: Path, src: Path) -> bool:
    return dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime and dest.stat().st_size > 0


def _encode(im: Image.Image, width: int, fmt: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + f".{uuid.uuid4().hex[:6]}.tmp")
    if fmt == "avif":
        im.save(tmp, "AVIF", quality=AVIF_QUALITY.get(width, 55), speed=8)
    else:
        q = WEBP_QUALITY.get(width, 40 if width == PLACEHOLDER_WIDTH else 76)
        im.save(tmp, "WEBP", quality=q, method=4)
    tmp.replace(dest)


def _open_for(src: Path, target_width: int) -> Image.Image:
    im = Image.open(src)
    im.draft("RGB", (target_width * 2, target_width * 2))  # fast JPEG downscale on decode
    im = ImageOps.exif_transpose(im)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
    return im


def _resized(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        return im
    h = round(im.height * width / im.width)
    return im.resize((width, h), Image.Resampling.LANCZOS)


def ensure_variant(filename: str, width: int, fmt: str = "webp") -> Path:
    """Return the path of one variant, generating it if missing or stale."""
    if fmt not in FORMATS or (fmt == "avif" and not AVIF_AVAILABLE):
        raise HTTPException(status_code=404, detail="Not found")
    if width not in VARIANT_WIDTHS and not (width == PLACEHOLDER_WIDTH and fmt == "webp"):
        raise HTTPException(status_code=404, detail="Not found")
    src = _safe_source(filename)
    dest = variant_file(src, width, fmt)
    if _fresh(dest, src):
        return dest
    with _lock_for(str(dest)):
        if _fresh(dest, src):
            return dest
        try:
            _encode(_resized(_open_for(src, width), width), width, fmt, dest)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(status_code=404, detail="Not found")
    return dest


def generate_all_variants(filename: str, formats: Iterable[str] = ("webp", "avif")) -> Dict[str, float]:
    """Decode the master once and write every width/format. Returns timings in ms."""
    src = _safe_source(filename)
    t0 = time.perf_counter()
    base = _open_for(src, max(VARIANT_WIDTHS))
    timings = {"decode": (time.perf_counter() - t0) * 1000}
    # Largest first, each size resized from the previous one (cascade): about 3x less
    # resampling work than resizing every width from the full-size master.
    im = base
    for width in sorted(VARIANT_WIDTHS, reverse=True):
        im = _resized(im, width)
        for fmt in formats:
            if fmt == "avif" and not AVIF_AVAILABLE:
                continue
            dest = variant_file(src, width, fmt)
            with _lock_for(str(dest)):
                if _fresh(dest, src):
                    continue
                t = time.perf_counter()
                _encode(im, width, fmt, dest)
                timings[f"{fmt}-{width}"] = (time.perf_counter() - t) * 1000
    dest = variant_file(src, PLACEHOLDER_WIDTH, "webp")
    if not _fresh(dest, src):
        _encode(_resized(im, PLACEHOLDER_WIDTH), PLACEHOLDER_WIDTH, "webp", dest)
    timings["total"] = (time.perf_counter() - t0) * 1000
    return timings


def schedule_variants(filename: str, on_done: Optional[Callable[[str], None]] = None):
    """Generate variants in the background so uploads return immediately."""
    if not settings.EAGER_IMAGE_VARIANTS:
        return None

    def job():
        try:
            t = generate_all_variants(filename)
            logger.info("variants ready", extra={"event": "image.variants", "file": filename,
                                                 "duration_ms": round(t["total"])})
            if on_done:
                on_done(filename)
        except Exception as e:  # never let a background failure surface to users
            logger.warning("variant generation failed for %s: %s", filename, e)

    return _executor.submit(job)


def mark_variants_ready(filename: str):
    from backend.database import SessionLocal
    from backend.models import MediaAsset

    with SessionLocal() as db:
        db.query(MediaAsset).filter(MediaAsset.filename == filename).update({MediaAsset.variants_ready: True})
        db.commit()


def delete_image_files(url: str):
    """Remove an uploaded file, its preserved original and cached variants
    (callers check that nothing references the URL first)."""
    if not url.startswith("/uploads/"):
        return
    name = url[len("/uploads/"):]
    try:
        src = _safe_source(name)
    except HTTPException:
        return
    for w in VARIANT_WIDTHS + (PLACEHOLDER_WIDTH,):
        for fmt in FORMATS:
            v = variant_file(src, w, fmt)
            if v.exists():
                v.unlink()
    original = settings.originals_dir / src.name
    if original.exists():
        original.unlink()
    src.unlink(missing_ok=True)
