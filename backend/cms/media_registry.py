"""Single place that records an uploaded image in the media library and kicks off
background variant generation. Used by vehicle uploads and the CMS media library."""
from typing import Optional

from sqlalchemy.orm import Session

from backend.cms.images import StoredImage, schedule_variants, mark_variants_ready
from backend.cms.service import new_id
from backend.models import MediaAsset, User


def register_media(db: Session, stored: StoredImage, user: User, folder: str,
                   original_name: Optional[str] = None, alt: Optional[str] = None) -> MediaAsset:
    m = MediaAsset(
        id=new_id("med"), url=stored.url, filename=stored.filename,
        original_name=(original_name or "")[:255] or None, mime_type=stored.mime_type,
        width=stored.width, height=stored.height, size_bytes=stored.size_bytes, sha256=stored.sha256,
        alt=(alt or "")[:300] or None, folder=folder, uploaded_by=user.username,
        original_path=stored.original_path, original_bytes=stored.original_bytes,
        placeholder=stored.placeholder, variants_ready=False,
    )
    db.add(m)
    return m


def after_commit_generate(filenames):
    """Call after the transaction commits so the background job sees the row."""
    for name in filenames:
        schedule_variants(name, on_done=mark_variants_ready)
