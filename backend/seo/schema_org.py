"""schema.org JSON-LD builders. Everything comes from the database / settings — nothing
here invents prices, ratings or reviews. Aggregate ratings are deliberately not emitted:
Google does not allow self-serving review markup for LocalBusiness."""
from typing import Any, Dict, List, Optional

from backend.config import settings
from backend.services.listing_facts import extract_facts

DAY_NAMES = {"Mo": "Monday", "Tu": "Tuesday", "We": "Wednesday", "Th": "Thursday",
             "Fr": "Friday", "Sa": "Saturday", "Su": "Sunday"}


def absolute(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    if url.startswith("https://") or url.startswith("http://"):
        return url
    return settings.SITE_URL + (url if url.startswith("/") else "/" + url)


def image_variant(url: Optional[str], width: int = 1280) -> Optional[str]:
    """Public URL of an optimised WebP variant for an uploaded image."""
    if url and url.startswith("/uploads/"):
        return f"/media/w{width}/{url[len('/uploads/'):]}"
    return url


def org_id() -> str:
    return settings.SITE_URL + "/#dealer"


def dealer(s: Dict[str, Any]) -> Dict[str, Any]:
    g, c, social = s["general"], s["contact"], s["social"]
    data: Dict[str, Any] = {
        "@type": "AutoDealer",
        "@id": org_id(),
        "name": g.get("siteName") or settings.SITE_NAME,
        "legalName": g.get("legalName") or None,
        "url": settings.SITE_URL + "/",
        "logo": absolute("/logo.png"),
        "image": absolute(s["seo"].get("defaultOgImage") or "/og-default.jpg"),
        "description": g.get("tagline") or None,
        "telephone": (c.get("phones") or [{}])[0].get("number"),
        "email": c.get("email") or None,
        "address": {
            "@type": "PostalAddress",
            "streetAddress": c.get("streetAddress"),
            "addressLocality": c.get("city"),
            "addressRegion": c.get("region"),
            "postalCode": c.get("postalCode"),
            "addressCountry": c.get("country") or "IN",
        },
        "areaServed": {"@type": "City", "name": c.get("city") or "Lucknow"},
        "hasMap": c.get("mapUrl") or None,
        "sameAs": [v for v in social.values() if v] or None,
        "priceRange": "₹₹₹",
    }
    if isinstance(c.get("latitude"), (int, float)) and isinstance(c.get("longitude"), (int, float)):
        data["geo"] = {"@type": "GeoCoordinates", "latitude": c["latitude"], "longitude": c["longitude"]}
    hours = []
    for h in c.get("openingHours") or []:
        days = [DAY_NAMES[d] for d in h.get("days", []) if d in DAY_NAMES]
        if days and h.get("opens") and h.get("closes"):
            hours.append({"@type": "OpeningHoursSpecification", "dayOfWeek": days,
                          "opens": h["opens"], "closes": h["closes"]})
    if hours:
        data["openingHoursSpecification"] = hours
    contact_points = [{"@type": "ContactPoint", "telephone": p["number"], "contactType": "sales",
                       "name": p.get("label"), "areaServed": "IN", "availableLanguage": ["en", "hi"]}
                      for p in c.get("phones") or [] if p.get("number")]
    if contact_points:
        data["contactPoint"] = contact_points
    return _clean(data)


def website(s: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "@type": "WebSite",
        "@id": settings.SITE_URL + "/#website",
        "url": settings.SITE_URL + "/",
        "name": s["general"].get("siteName") or settings.SITE_NAME,
        "publisher": {"@id": org_id()},
        "inLanguage": "en-IN",
    }


def webpage(path: str, name: str, description: Optional[str], date_modified: Optional[str] = None,
            main_entity: Optional[str] = None) -> Dict[str, Any]:
    """The page itself, with when its content last changed (freshness signal for search and AI)."""
    return _clean({
        "@type": "WebPage",
        "@id": absolute(path) + "#webpage",
        "url": absolute(path),
        "name": name,
        "description": (description or "")[:300] or None,
        "isPartOf": {"@id": settings.SITE_URL + "/#website"},
        "about": {"@id": org_id()},
        "inLanguage": "en-IN",
        "dateModified": date_modified,
        "mainEntity": {"@id": absolute(main_entity)} if main_entity else None,
    })


def _iso_duration(seconds: Any) -> Optional[str]:
    try:
        total = int(round(float(seconds)))
    except (TypeError, ValueError):
        return None
    if total <= 0:
        return None
    return f"PT{total // 60}M{total % 60}S"


def video_object(clip: Dict[str, Any], name: str, description: str) -> Optional[Dict[str, Any]]:
    """VideoObject for an uploaded clip (About intro, customer stories). Needs a poster."""
    if not clip or not clip.get("src") or not clip.get("poster"):
        return None
    return _clean({
        "@type": "VideoObject",
        "@id": absolute(clip["src"]) + "#video",
        "name": name,
        "description": description,
        "thumbnailUrl": [absolute(image_variant(clip["poster"], 1280))],
        "contentUrl": absolute(clip["src"]),
        "uploadDate": clip.get("uploadedAt") or None,
        "duration": _iso_duration(clip.get("duration")),
        "width": clip.get("width") or None,
        "height": clip.get("height") or None,
        "transcript": clip.get("transcript") or None,
        "publisher": {"@id": org_id()},
    })


def breadcrumbs(items: List[tuple]) -> Dict[str, Any]:
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": absolute(path)}
            for i, (name, path) in enumerate(items)
        ],
    }


def faq(items: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
    items = [i for i in items if i.get("question") and i.get("answer")]
    if not items:
        return None
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": i["question"], "acceptedAnswer": {"@type": "Answer", "text": i["answer"]}}
        for i in items]}


def _fuel(v: str) -> str:
    return {"petrol": "Gasoline", "diesel": "Diesel", "electric": "Electric", "hybrid": "Hybrid",
            "cng": "CNG"}.get((v or "").lower(), v or "")


def vehicle(v: Dict[str, Any], path: str) -> Dict[str, Any]:
    """Car + Product with an Offer. v is Vehicle.to_dict(public=True)."""
    facts = extract_facts(v)
    year = v.get("year") or facts.get("year")
    km = v.get("kmDriven") or facts.get("km_driven")
    owners = v.get("owners") or facts.get("owners")
    images = [absolute(image_variant(i, 1280)) for i in (v.get("images") or [])[:8]]
    name = " ".join(str(p) for p in (year, v.get("brand"), v.get("model"), v.get("badge")) if p)
    availability = {"sold": "https://schema.org/SoldOut", "reserved": "https://schema.org/LimitedAvailability"}.get(
        v.get("status"), "https://schema.org/InStock")
    data: Dict[str, Any] = {
        "@type": ["Car", "Product"],
        "@id": absolute(path) + "#vehicle",
        "name": name,
        "url": absolute(path),
        "brand": {"@type": "Brand", "name": v.get("brand")},
        "model": v.get("model"),
        "vehicleConfiguration": v.get("badge") or None,
        "bodyType": v.get("lifestyle") or v.get("type") or None,
        "fuelType": _fuel(v.get("fuel")),
        "vehicleTransmission": v.get("transmission") or None,
        "seatingCapacity": v.get("seats") or None,
        "vehicleEngine": {"@type": "EngineSpecification", "name": v.get("engine")} if v.get("engine") else None,
        "itemCondition": "https://schema.org/NewCondition" if v.get("condition") == "new" else "https://schema.org/UsedCondition",
        "image": images or None,
        "description": (v.get("description") or "")[:500] or None,
        "color": ", ".join(c.get("name", "") if isinstance(c, dict) else str(c) for c in (v.get("colors") or [])) or None,
        "vehicleModelDate": str(year) if year else None,
        "mileageFromOdometer": {"@type": "QuantitativeValue", "value": km, "unitCode": "KMT"} if km else None,
        "numberOfPreviousOwners": owners,
        "offers": {
            "@type": "Offer",
            "priceCurrency": "INR",
            "price": round(float(v["price"]) * 100000) if v.get("price") else None,
            "availability": availability,
            "url": absolute(path),
            "seller": {"@id": org_id()},
            "itemCondition": "https://schema.org/UsedCondition",
        },
    }
    return _clean(data)


def item_list(name: str, vehicles: List[Dict[str, Any]], path_for) -> Dict[str, Any]:
    return {
        "@type": "ItemList",
        "name": name,
        "numberOfItems": len(vehicles),
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": absolute(path_for(v)),
             "name": " ".join(str(p) for p in (v.get("year"), v.get("brand"), v.get("model")) if p)}
            for i, v in enumerate(vehicles[:100])
        ],
    }


def promo_offer(o: Dict[str, Any], path: str) -> Dict[str, Any]:
    """A showroom promotion. No priceSpecification: these are benefits, not a sale price."""
    return _clean({
        "@type": "Offer",
        "@id": absolute(path) + "#offer",
        "name": o.get("title"),
        "description": o.get("summary") or o.get("description"),
        "url": absolute(path),
        "image": absolute(image_variant(o.get("image"), 1280)) if o.get("image") else None,
        "validFrom": o.get("startsAt"),
        "validThrough": o.get("endsAt"),
        "offeredBy": {"@id": org_id()},
        "availability": "https://schema.org/InStock" if o.get("effectiveStatus") == "live" else "https://schema.org/Discontinued",
    })


def _clean(d: Any) -> Any:
    if isinstance(d, dict):
        return {k: _clean(v) for k, v in d.items() if v not in (None, "", [], {})}
    if isinstance(d, list):
        return [_clean(v) for v in d if v not in (None, "", [], {})]
    return d


def graph(*nodes: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return {"@context": "https://schema.org", "@graph": [n for n in nodes if n]}
