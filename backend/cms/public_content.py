"""Builds the public view of CMS content. Used by the JSON API and the SEO renderer so
that what crawlers see is exactly what visitors see."""
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.cms.service import (
    content_cache, get_settings, public_settings, hero_is_live, offer_effective_status, now_utc, slugify,
)
from backend.models import Vehicle, HeroSlide, FeaturedVehicle, Review, Offer


def format_price_lakhs(lakhs: Optional[float]) -> str:
    if lakhs is None:
        return ""
    if lakhs >= 100:
        cr = lakhs / 100
        return f"₹{cr:.2f} Cr".replace(".00 ", " ")
    return f"₹{lakhs:.2f} Lakh".replace(".00 ", " ")


def public_vehicles(db: Session) -> List[Vehicle]:
    return (db.query(Vehicle).filter(Vehicle.is_published.is_(True))
            .order_by(Vehicle.created_at.desc()).all())


def vehicle_title(v: Vehicle) -> str:
    parts = [str(v.year) if v.year else None, v.brand, v.model]
    return " ".join(p for p in parts if p)


def brand_slug(brand: str) -> str:
    return slugify(brand)


def brand_index(vehicles: List[Vehicle]) -> List[Dict[str, Any]]:
    by: Dict[str, Dict[str, Any]] = {}
    for v in vehicles:
        if v.status == "sold":
            continue
        b = by.setdefault(brand_slug(v.brand), {"slug": brand_slug(v.brand), "name": v.brand, "count": 0})
        b["count"] += 1
    return sorted(by.values(), key=lambda b: (-b["count"], b["name"]))


def inventory_stats(vehicles: List[Vehicle]) -> Dict[str, Any]:
    stock = [v for v in vehicles if v.status != "sold"]
    prices = [v.price for v in stock if v.price]
    return {
        "count": len(stock),
        "brands": len({v.brand for v in stock}),
        "minPrice": min(prices) if prices else None,
        "maxPrice": max(prices) if prices else None,
        "priceRange": f"{format_price_lakhs(min(prices))} – {format_price_lakhs(max(prices))}" if prices else "",
    }


def _vehicle_card(v: Vehicle) -> Dict[str, Any]:
    return v.to_dict(public=True)


def live_hero_slides(db: Session, preview: bool = False) -> List[Dict[str, Any]]:
    q = db.query(HeroSlide).filter(HeroSlide.status != "archived").order_by(HeroSlide.sort_order, HeroSlide.created_at)
    slides = [s for s in q.all() if (preview and s.status in ("draft", "published")) or hero_is_live(s)]
    return [s.to_dict(public=True) for s in slides]


def auto_featured(vehicles: List[Vehicle], limit: int) -> List[Vehicle]:
    """Fallback when no showcase is configured: the previous behaviour (premium cars with
    studio photos first, by price)."""
    stock = [v for v in vehicles if v.status != "sold"]
    with_photos = [v for v in stock if any(str(i).startswith("/uploads") for i in (v.images or []))] or stock
    with_photos.sort(key=lambda v: (v.category != "premium", -(v.price or 0)))
    return with_photos[:limit]


def featured_vehicles(db: Session, vehicles: List[Vehicle], limit: int) -> Dict[str, Any]:
    rows = (db.query(FeaturedVehicle).filter(FeaturedVehicle.is_visible.is_(True))
            .order_by(FeaturedVehicle.sort_order, FeaturedVehicle.created_at).all())
    by_id = {v.id: v for v in vehicles if v.status != "sold"}
    items = []
    for r in rows:
        v = by_id.get(r.vehicle_id)
        if v:
            card = _vehicle_card(v)
            card["showcaseLabel"] = r.label
            if r.card_image:
                card["cardImage"] = r.card_image
            items.append(card)
    if items:
        return {"source": "cms", "vehicles": items[:limit]}
    return {"source": "auto", "vehicles": [_vehicle_card(v) for v in auto_featured(vehicles, limit)]}


def approved_reviews(db: Session, limit: int = 50) -> List[Dict[str, Any]]:
    rows = (db.query(Review).filter(Review.status == "approved")
            .order_by(Review.is_featured.desc(), Review.sort_order, Review.created_at.desc()).limit(limit).all())
    return [r.to_dict(public=True) for r in rows]


def visible_offers(db: Session, preview: bool = False, home_only: bool = False) -> List[Dict[str, Any]]:
    at = now_utc()
    out = []
    for o in db.query(Offer).filter(Offer.status != "archived").order_by(Offer.sort_order, Offer.ends_at).all():
        eff = offer_effective_status(o, at)
        if eff == "live" or (preview and eff in ("draft", "scheduled", "live")):
            if home_only and not o.show_on_home:
                continue
            out.append(o.to_dict(public=True, effective_status=eff))
    return out


def _collections(settings_: Dict[str, Any], vehicles: List[Vehicle]) -> List[Dict[str, Any]]:
    from backend.seo.listing import collection_index
    city = settings_["contact"].get("city") or "Lucknow"
    return [{"slug": c["slug"], "title": c["title"], "path": c["path"], "count": c["count"]}
            for c in collection_index([v.to_dict(public=True) for v in vehicles], city) if c["indexable"]]


def home_payload(db: Session, preview: bool = False) -> Dict[str, Any]:
    def build():
        settings_ = public_settings(db, draft=preview)
        vehicles = public_vehicles(db)
        sections = {s["id"]: s for s in settings_["homepage"].get("sections", [])}
        showcase_limit = int(sections.get("showcase", {}).get("limit") or 12)
        reviews_limit = int(sections.get("testimonials", {}).get("limit") or 8)
        offers_limit = int(sections.get("offers", {}).get("limit") or 3)
        return {
            "settings": settings_,
            "hero": live_hero_slides(db, preview),
            "featured": featured_vehicles(db, vehicles, showcase_limit),
            "reviews": approved_reviews(db, reviews_limit),
            "offers": visible_offers(db, preview, home_only=True)[:offers_limit],
            "stats": inventory_stats(vehicles),
            "brands": brand_index(vehicles),
            # Browse-by pages with enough cars to be worth a visit (footer links).
            "collections": _collections(settings_, vehicles),
            "preview": preview,
        }

    if preview:
        return build()
    return content_cache.get_or_set("home", build)


def site_settings_cached(db: Session) -> Dict[str, Any]:
    return content_cache.get_or_set("settings:full", lambda: get_settings(db))
