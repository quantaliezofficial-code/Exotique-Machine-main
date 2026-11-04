"""Find where a media URL is used, so files in use are never deleted."""
import json
from typing import Dict, List

from sqlalchemy.orm import Session

from backend.models import Vehicle, HeroSlide, Offer, Review, FeaturedVehicle, SiteSetting


def find_references(db: Session, url: str) -> List[Dict[str, str]]:
    refs: List[Dict[str, str]] = []
    for v in db.query(Vehicle.id, Vehicle.brand, Vehicle.model, Vehicle.images).all():
        if url in (v.images or []):
            refs.append({"type": "vehicle", "id": v.id, "label": f"{v.brand} {v.model}"})
    for s in db.query(HeroSlide).filter((HeroSlide.desktop_image == url) | (HeroSlide.mobile_image == url)).all():
        refs.append({"type": "hero", "id": s.id, "label": s.title, "status": s.status})
    for o in db.query(Offer).filter(Offer.image == url).all():
        refs.append({"type": "offer", "id": o.id, "label": o.title, "status": o.status})
    for r in db.query(Review).filter(Review.photo == url).all():
        refs.append({"type": "review", "id": r.id, "label": r.customer_name, "status": r.status})
    for f in db.query(FeaturedVehicle).filter(FeaturedVehicle.card_image == url).all():
        refs.append({"type": "showcase", "id": f.id, "label": f.vehicle_id})
    for s in db.query(SiteSetting).all():
        blob = json.dumps([s.draft_value, s.published_value])
        if f'"{url}"' in blob:
            refs.append({"type": "settings", "id": s.key, "label": f"Settings: {s.key}"})
    return refs


def url_is_referenced(db: Session, url: str) -> bool:
    return bool(find_references(db, url))
