"""Extract listing facts that already exist as free text in a vehicle record.

The original schema had no columns for year / kilometres / owners / registration, so the
import pipeline wrote them into `features`, `badge`, `mileage` and the id. This module
reads them back *only when they are stated*; it never guesses.
"""
import re
from typing import Iterable, Optional, Dict, Any

_YEAR_RE = re.compile(r"(?:year of manufacture|model year|year)\s*[:\-]?\s*((?:19|20)\d{2})", re.I)
_BADGE_YEAR_RE = re.compile(r"\(((?:19|20)\d{2})\)")
_ID_YEAR_RE = re.compile(r"-((?:19|20)\d{2})-")
_KM_K_RE = re.compile(r"(\d+(?:\.\d+)?)\s*k\s*(?:verified\s+|certified\s+)?(?:kms?|kilomet(?:er|re)s?)\b", re.I)
_KM_LAKH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(?:l|lakh|lac)\s*(?:verified\s+|certified\s+)?(?:kms?|kilomet(?:er|re)s?)\b", re.I)
_KM_FULL_RE = re.compile(r"(\d{1,3}(?:,\d{3})+|\d{4,7})\s*(?:kms?|kilomet(?:er|re)s?)\b", re.I)
_REG_RE = re.compile(r"registration\s*[:\-]\s*([A-Z]{2}\s?\d{1,2}[A-Z0-9 ]{0,8})", re.I)
_OWNER_WORDS = {"single": 1, "1st": 1, "first": 1, "2nd": 2, "second": 2, "3rd": 3, "third": 3, "4th": 4}
_OWNER_RE = re.compile(r"(single|1st|first|2nd|second|3rd|third|4th)\s*(?:1st\s*)?owner", re.I)


def _texts(vehicle: Dict[str, Any]) -> Iterable[str]:
    for f in vehicle.get("features") or []:
        if isinstance(f, str):
            yield f
    for key in ("badge", "mileage", "description"):
        v = vehicle.get(key)
        if isinstance(v, str):
            yield v


def parse_year(vehicle: Dict[str, Any]) -> Optional[int]:
    for t in _texts(vehicle):
        m = _YEAR_RE.search(t)
        if m:
            return int(m.group(1))
    m = _BADGE_YEAR_RE.search(vehicle.get("badge") or "")
    if m:
        return int(m.group(1))
    m = _ID_YEAR_RE.search(f"-{vehicle.get('id') or ''}-")
    if m:
        return int(m.group(1))
    return None


def parse_km(vehicle: Dict[str, Any]) -> Optional[int]:
    for t in _texts(vehicle):
        m = _KM_K_RE.search(t)
        if m:
            return int(round(float(m.group(1)) * 1000))
        m = _KM_LAKH_RE.search(t)
        if m:
            return int(round(float(m.group(1)) * 100000))
        m = _KM_FULL_RE.search(t)
        if m:
            return int(m.group(1).replace(",", ""))
    return None


def parse_owners(vehicle: Dict[str, Any]) -> Optional[int]:
    for t in _texts(vehicle):
        m = _OWNER_RE.search(t)
        if m:
            return _OWNER_WORDS[m.group(1).lower()]
    return None


def parse_registration(vehicle: Dict[str, Any]) -> Optional[str]:
    for t in _texts(vehicle):
        m = _REG_RE.search(t)
        if m:
            return m.group(1).strip().upper()[:40]
    return None


def extract_facts(vehicle: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "year": parse_year(vehicle),
        "km_driven": parse_km(vehicle),
        "owners": parse_owners(vehicle),
        "registration": parse_registration(vehicle),
    }
