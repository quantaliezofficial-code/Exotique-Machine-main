"""Shared CMS helpers: time, visibility rules, settings, audit trail and cache invalidation."""
import copy
import datetime
import re
import threading
import time
import uuid
from typing import Any, Callable, Dict, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from backend.cms.defaults import DEFAULT_SETTINGS
from backend.models import ContentAuditLog, Offer, HeroSlide, SiteSetting, User

IST = ZoneInfo("Asia/Kolkata")
UTC = datetime.timezone.utc


def now_utc() -> datetime.datetime:
    return datetime.datetime.now(UTC)


def as_utc(dt: Optional[datetime.datetime]) -> Optional[datetime.datetime]:
    """SQLite returns naive datetimes; treat them as UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def parse_datetime(value: Any) -> Optional[datetime.datetime]:
    """Accept ISO strings. Values without an offset are business time (Asia/Kolkata)."""
    if value in (None, ""):
        return None
    if isinstance(value, datetime.datetime):
        dt = value
    else:
        s = str(value).strip().replace("Z", "+00:00")
        dt = datetime.datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    return dt.astimezone(UTC)


def new_id(prefix: str) -> str:
    return f"{prefix}_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"


def slugify(text: str, max_len: int = 120) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return s[:max_len].strip("-") or "item"


# --------------------------------------------------------------------------
# Visibility rules
# --------------------------------------------------------------------------


def offer_effective_status(offer: Offer, at: Optional[datetime.datetime] = None) -> str:
    """draft | scheduled | live | paused | expired | archived"""
    at = at or now_utc()
    if offer.status in ("draft", "archived", "paused"):
        return offer.status
    start, end = as_utc(offer.starts_at), as_utc(offer.ends_at)
    if end and end < at:
        return "expired"
    if start and start > at:
        return "scheduled"
    return "live"


def hero_is_live(slide: HeroSlide, at: Optional[datetime.datetime] = None) -> bool:
    at = at or now_utc()
    if slide.status != "published":
        return False
    start, end = as_utc(slide.starts_at), as_utc(slide.ends_at)
    if start and start > at:
        return False
    if end and end < at:
        return False
    return True


# --------------------------------------------------------------------------
# Content cache (single worker process) — bumped on every content write
# --------------------------------------------------------------------------


class ContentCache:
    """Short-lived cache of public, non-personal content only.

    The TTL also bounds how late a *scheduled* hero slide or offer can appear or expire
    (nothing is written to the database at that moment, so nothing invalidates it).
    """

    def __init__(self, ttl_seconds: int = 60):
        self.ttl = ttl_seconds
        self.version = 1
        self._data: Dict[str, Any] = {}
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get_or_set(self, key: str, factory: Callable[[], Any]) -> Any:
        now = time.monotonic()
        with self._lock:
            entry = self._data.get(key)
            if entry and entry[0] == self.version and now - entry[1] < self.ttl:
                self.hits += 1
                return entry[2]
        self.misses += 1
        value = factory()
        with self._lock:
            self._data[key] = (self.version, now, value)
            if len(self._data) > 2000:
                self._data.clear()
        return value

    def invalidate(self):
        with self._lock:
            self.version += 1
            self._data.clear()


content_cache = ContentCache()


def invalidate_content():
    content_cache.invalidate()


# --------------------------------------------------------------------------
# Settings
# --------------------------------------------------------------------------

SETTING_KEYS = tuple(DEFAULT_SETTINGS.keys())


def _merge_defaults(default: Any, value: Any) -> Any:
    """Fill keys that are missing from stored dicts (e.g. after adding a new setting)."""
    if isinstance(default, dict) and isinstance(value, dict):
        merged = copy.deepcopy(default)
        for k, v in value.items():
            merged[k] = _merge_defaults(default.get(k), v) if k in default else v
        return merged
    return copy.deepcopy(value if value is not None else default)


def ensure_default_settings(db: Session):
    existing = {s.key for s in db.query(SiteSetting.key).all()}
    for key, value in DEFAULT_SETTINGS.items():
        if key not in existing:
            db.add(SiteSetting(key=key, draft_value=copy.deepcopy(value),
                               published_value=copy.deepcopy(value),
                               updated_by="system", published_by="system",
                               published_at=now_utc()))
    db.commit()


def get_settings(db: Session, draft: bool = False) -> Dict[str, Any]:
    rows = {s.key: s for s in db.query(SiteSetting).filter(SiteSetting.key.in_(SETTING_KEYS)).all()}
    out = {}
    for key, default in DEFAULT_SETTINGS.items():
        row = rows.get(key)
        stored = None
        if row is not None:
            stored = row.draft_value if draft and row.draft_value is not None else row.published_value
        out[key] = _merge_defaults(default, stored)
    return out


def public_settings(db: Session, draft: bool = False) -> Dict[str, Any]:
    s = get_settings(db, draft=draft)
    seo = dict(s["seo"])
    # Verification tokens are rendered into <head> server-side only.
    seo.pop("googleSiteVerification", None)
    seo.pop("bingSiteVerification", None)
    s["seo"] = seo
    return s


# --------------------------------------------------------------------------
# Audit trail
# --------------------------------------------------------------------------


def audit(db: Session, user: User, entity_type: str, entity_id: str, action: str,
          before: Any = None, after: Any = None):
    db.add(ContentAuditLog(
        id=new_id("aud"),
        timestamp=now_utc(),
        actor_id=user.id,
        actor_username=user.username,
        entity_type=entity_type,
        entity_id=str(entity_id)[:160],
        action=action,
        before=before,
        after=after,
    ))
