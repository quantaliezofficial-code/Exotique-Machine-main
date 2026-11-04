"""Optimised image variants for uploaded images.

/media/w{width}/{file}       WebP at a fixed display width
/media/avif/w{width}/{file}  AVIF at a fixed display width (smaller; used via <picture>)
/media/w32/{file}            tiny blurred placeholder

Variants are written once (in the background right after upload, or on first request)
and then served as immutable files. The file name of an upload never changes — a
replaced image gets a new name — so a one-year immutable cache is safe.
"""
from fastapi import APIRouter
from fastapi.responses import FileResponse

from backend.cms.images import ensure_variant

router = APIRouter(tags=["Media"], include_in_schema=False)

IMMUTABLE = {"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"}


@router.api_route("/media/w{width}/{filename}", methods=["GET", "HEAD"])
def webp_variant(width: int, filename: str):
    return FileResponse(ensure_variant(filename, width, "webp"), media_type="image/webp", headers=IMMUTABLE)


@router.api_route("/media/avif/w{width}/{filename}", methods=["GET", "HEAD"])
def avif_variant(width: int, filename: str):
    return FileResponse(ensure_variant(filename, width, "avif"), media_type="image/avif", headers=IMMUTABLE)
