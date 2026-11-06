"""IndexNow: tell Bing (and other IndexNow engines) the moment a car is added, changed or
sold, instead of waiting for the next crawl. Bing's index also feeds ChatGPT search and
Copilot, so fresh stock shows up there sooner.

Off unless INDEXNOW_KEY is set. The key is published at /<key>.txt (proves ownership).
Pings run in a background thread, are best-effort and never block or fail a request.
"""
import json
import logging
import re
import threading
import urllib.request
from typing import Iterable

from backend.config import settings

logger = logging.getLogger("luxura.indexnow")
ENDPOINT = "https://api.indexnow.org/indexnow"
KEY_RE = re.compile(r"^[A-Za-z0-9-]{8,128}$")


def key() -> str:
    k = (getattr(settings, "INDEXNOW_KEY", "") or "").strip()
    return k if KEY_RE.match(k) else ""


def _send(urls: list) -> None:
    k = key()
    host = settings.SITE_URL.split("://", 1)[-1].split("/", 1)[0]
    body = json.dumps({"host": host, "key": k, "keyLocation": f"{settings.SITE_URL}/{k}.txt", "urlList": urls}).encode()
    req = urllib.request.Request(ENDPOINT, data=body, method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            logger.info("IndexNow accepted %d URL(s): HTTP %s", len(urls), r.status)
    except Exception as e:  # best effort only
        logger.warning("IndexNow ping failed: %s", e)


def notify(paths: Iterable[str]) -> None:
    """Queue a ping for these site paths (e.g. '/cars/bmw-x5'). No-op without a key,
    outside production, or for non-public sites."""
    if not key() or settings.ENVIRONMENT != "production" or not settings.SITE_URL.startswith("https://"):
        return
    urls = sorted({settings.SITE_URL.rstrip("/") + p for p in paths if p and p.startswith("/")})[:1000]
    if urls:
        threading.Thread(target=_send, args=(urls,), daemon=True).start()
