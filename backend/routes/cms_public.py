"""Public CMS API. Returns only published, currently-valid content."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from backend.cms.public_content import (
    home_payload, live_hero_slides, featured_vehicles, approved_reviews, visible_offers, public_vehicles,
)
from backend.cms.service import public_settings, offer_effective_status, content_cache, new_id, now_utc
from backend.database import get_db
from backend.models import Offer, Review, User, Vehicle
from backend.permissions import has_permission
from backend.schemas import ReviewSubmission
from backend.security import get_optional_user, public_form_rate_limit, get_client_ip

router = APIRouter(prefix="/api/public", tags=["Public website content"])

PREVIEW_PERMS = ("cms:hero", "cms:offers", "cms:reviews", "cms:settings", "cms:showcase")


def _is_preview(preview: Optional[int], user: Optional[User]) -> bool:
    return bool(preview) and user is not None and any(has_permission(user, p) for p in PREVIEW_PERMS)


def _cache_headers(response: Response, preview: bool):
    # Preview responses contain drafts: never cache them anywhere.
    response.headers["Cache-Control"] = "private, no-store" if preview else "public, max-age=30"


@router.get("/home")
def get_home(response: Response, preview: Optional[int] = None, db: Session = Depends(get_db),
             user: Optional[User] = Depends(get_optional_user)):
    is_preview = _is_preview(preview, user)
    _cache_headers(response, is_preview)
    return home_payload(db, preview=is_preview)


@router.get("/site-settings")
def get_site_settings(response: Response, preview: Optional[int] = None, db: Session = Depends(get_db),
                      user: Optional[User] = Depends(get_optional_user)):
    is_preview = _is_preview(preview, user)
    _cache_headers(response, is_preview)
    if is_preview:
        return {"settings": public_settings(db, draft=True)}
    return content_cache.get_or_set("settings:public", lambda: {"settings": public_settings(db)})


@router.get("/hero")
def get_hero(response: Response, db: Session = Depends(get_db)):
    _cache_headers(response, False)
    return {"slides": live_hero_slides(db)}


@router.get("/featured-vehicles")
def get_featured(response: Response, limit: int = 12, db: Session = Depends(get_db)):
    _cache_headers(response, False)
    return featured_vehicles(db, public_vehicles(db), max(1, min(limit, 50)))


@router.get("/reviews")
def get_reviews(response: Response, limit: int = 20, db: Session = Depends(get_db)):
    _cache_headers(response, False)
    return {"reviews": approved_reviews(db, max(1, min(limit, 100)))}


@router.post("/reviews", status_code=201, dependencies=[Depends(public_form_rate_limit("review"))])
def submit_review(payload: ReviewSubmission, request: Request, db: Session = Depends(get_db)):
    """Customers can submit a review; it stays hidden until an admin approves it."""
    if payload.website:
        return {"success": True}
    vehicle_id = None
    if payload.vehicleId and db.query(Vehicle.id).filter(Vehicle.id == payload.vehicleId).first():
        vehicle_id = payload.vehicleId
    db.add(Review(id=new_id("rev"), customer_name=payload.customerName, customer_title=payload.customerTitle,
                  rating=payload.rating, body=payload.body, vehicle_id=vehicle_id, source="website",
                  review_date=now_utc(), status="pending", submitted_ip=get_client_ip(request)))
    db.commit()
    return {"success": True, "message": "Thank you! Your review will appear after it is checked by our team."}


@router.get("/offers")
def get_offers(response: Response, preview: Optional[int] = None, db: Session = Depends(get_db),
               user: Optional[User] = Depends(get_optional_user)):
    is_preview = _is_preview(preview, user)
    _cache_headers(response, is_preview)
    if is_preview:
        return {"offers": visible_offers(db, preview=True)}
    return content_cache.get_or_set("offers:public", lambda: {"offers": visible_offers(db)})


@router.get("/offers/{slug}")
def get_offer(slug: str, response: Response, preview: Optional[int] = None, db: Session = Depends(get_db),
              user: Optional[User] = Depends(get_optional_user)):
    is_preview = _is_preview(preview, user)
    offer = db.query(Offer).filter(Offer.slug == slug).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    eff = offer_effective_status(offer)
    if eff in ("draft", "archived", "paused", "scheduled") and not is_preview:
        raise HTTPException(status_code=404, detail="Offer not found")
    _cache_headers(response, is_preview)
    vehicle = None
    if offer.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.id == offer.vehicle_id, Vehicle.is_published.is_(True)).first()
        vehicle = v.to_dict(public=True) if v else None
    # Expired offers stay readable (with a clear "ended" state) but are not promoted.
    return {"offer": offer.to_dict(public=True, effective_status=eff), "vehicle": vehicle}


# ------------------------------------------------------------------ listing summaries


@router.get("/listing")
def listing(response: Response, brand: Optional[str] = None, collection: Optional[str] = None,
            db: Session = Depends(get_db)):
    """Answer-first summary, facts and browse links for /cars, /brands/<slug> and
    /used-cars/<slug>. The server-rendered snapshot shows the same text (backend/seo/render.py)."""
    from backend.seo.listing import listing_payload

    def build():
        return listing_payload(db, public_settings(db), brand=brand, collection=collection)

    data = content_cache.get_or_set(f"listing:{brand}:{collection}", build)
    if data is None:
        raise HTTPException(status_code=404, detail="Not found")
    response.headers["Cache-Control"] = "public, max-age=60"
    return data
