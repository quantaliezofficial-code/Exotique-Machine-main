"""Admin CMS API: hero, showcase, reviews, offers, media library, site settings, audit.

Permission model
* cms:<module> lets a user create and edit drafts in that module.
* cms:publish is additionally required to make anything live (or take it down).
  Without it, every save is forced to draft — this is the "Editor" workflow.
* Every change is written to content_audit_logs with before/after values.
"""
import copy
import json
import logging
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.cms.defaults import DEFAULT_SETTINGS
from backend.cms.images import store_image, delete_image_files, schedule_variants, mark_variants_ready, parse_crop_list
from backend.cms.media_registry import register_media
from backend.cms.videos import VIDEO_URL_RE, store_poster, store_video
from backend.cms.references import find_references
from backend.cms.service import (
    audit, invalidate_content, new_id, now_utc, parse_datetime, slugify, offer_effective_status,
    get_settings, SETTING_KEYS,
)
from backend.database import get_db
from backend.models import (
    HeroSlide, FeaturedVehicle, Review, Offer, MediaAsset, SiteSetting, ContentAuditLog, Vehicle, User,
    CONTENT_STATUSES, OFFER_STATUSES, REVIEW_STATUSES, Enquiry, FinanceApplication, TestDriveBooking, ServiceBooking,
)
from backend.permissions import has_permission
from backend.security import require_permission, require_any_permission, get_current_user

logger = logging.getLogger("luxura.cms")

router = APIRouter(prefix="/api/admin", tags=["Admin CMS"])

IMAGE_URL_RE = re.compile(r"^(/uploads/[A-Za-z0-9_.-]+|/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp)|https://[^\s\"'<>]+)$", re.I)
LINK_RE = re.compile(r"^(/(?!/)[^\s\"'<>]*|#[A-Za-z0-9_-]+|https://[^\s\"'<>]+|tel:\+?[0-9]{6,15}|mailto:[^\s\"'<>]+)$")


def _require_publish(user: User):
    if not has_permission(user, "cms:publish"):
        raise HTTPException(status_code=403, detail="Publishing requires the cms:publish permission. Save as draft and ask a publisher.")


def _img(v: Optional[str], required: bool = False) -> Optional[str]:
    if v in (None, ""):
        if required:
            raise ValueError("An image is required")
        return None
    if not IMAGE_URL_RE.match(v) or ".." in v:
        raise ValueError("Image must be an uploaded file (/uploads/...) or an https:// URL")
    return v


def _link(v: Optional[str]) -> Optional[str]:
    if v in (None, ""):
        return None
    if not LINK_RE.match(v):
        raise ValueError("Link must start with /, https://, tel: or mailto:")
    return v


def _video_clip(it: Any, required: bool) -> None:
    """A video entry in settings: an uploaded web video, an image poster and short texts."""
    if not isinstance(it, dict):
        raise ValueError("Invalid video entry")
    src = it.get("src") or ""
    if not src:
        if required:
            raise ValueError("Each customer story needs a video")
        return
    if not VIDEO_URL_RE.match(src):
        raise ValueError("Videos must be uploaded through the admin")
    _img(it.get("poster"))
    for k, n in (("name", 80), ("caption", 200), ("car", 120), ("title", 120), ("description", 600), ("transcript", 6000)):
        if len(str(it.get(k) or "")) > n:
            raise ValueError(f"Video {k} is limited to {n} characters")


class _Payload(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


def _vehicle_exists(db: Session, vehicle_id: Optional[str]):
    if vehicle_id and not db.query(Vehicle.id).filter(Vehicle.id == vehicle_id).first():
        raise HTTPException(status_code=400, detail=f"Vehicle '{vehicle_id}' does not exist")


def _done(db: Session):
    db.commit()
    invalidate_content()


# ==========================================================================
# Summary
# ==========================================================================


@router.get("/cms/summary")
def cms_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    at = now_utc()
    offers = db.query(Offer).all()
    eff = [offer_effective_status(o, at) for o in offers]
    data = {
        "heroSlides": {s: db.query(HeroSlide).filter(HeroSlide.status == s).count() for s in CONTENT_STATUSES},
        "showcase": db.query(FeaturedVehicle).count(),
        "reviews": {s: db.query(Review).filter(Review.status == s).count() for s in REVIEW_STATUSES},
        "offers": {k: eff.count(k) for k in ("draft", "scheduled", "live", "paused", "expired", "archived")},
        "media": db.query(MediaAsset).count(),
        "vehicles": {
            "published": db.query(Vehicle).filter(Vehicle.is_published.is_(True)).count(),
            "unpublished": db.query(Vehicle).filter(Vehicle.is_published.is_(False)).count(),
            "sold": db.query(Vehicle).filter(Vehicle.status == "sold").count(),
        },
    }
    if has_permission(user, "leads:view"):
        data["leads"] = {
            "enquiries": db.query(Enquiry).filter(Enquiry.status == "new").count(),
            "finance": db.query(FinanceApplication).filter(FinanceApplication.status == "pending").count(),
            "testDrives": db.query(TestDriveBooking).filter(TestDriveBooking.status == "scheduled").count(),
            "service": db.query(ServiceBooking).filter(ServiceBooking.status == "pending").count(),
        }
    pending_drafts = db.query(SiteSetting).filter(SiteSetting.key.in_(SETTING_KEYS)).all()
    data["settingsWithUnpublishedChanges"] = [s.key for s in pending_drafts if s.draft_value != s.published_value]
    return data


# ==========================================================================
# Hero slides
# ==========================================================================


class HeroPayload(_Payload):
    title: str = Field(..., min_length=1, max_length=200)
    eyebrow: Optional[str] = Field(None, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    watermark: Optional[str] = Field(None, max_length=60)
    ctaLabel: Optional[str] = Field(None, max_length=80)
    ctaUrl: Optional[str] = Field(None, max_length=300)
    desktopImage: str = Field(..., max_length=500)
    mobileImage: Optional[str] = Field(None, max_length=500)
    imageAlt: Optional[str] = Field(None, max_length=300)
    vehicleId: Optional[str] = Field(None, max_length=128)
    sortOrder: int = 0
    status: str = "draft"
    startsAt: Optional[str] = None
    endsAt: Optional[str] = None

    _i1 = field_validator("desktopImage")(lambda cls, v: _img(v, True))
    _i2 = field_validator("mobileImage")(lambda cls, v: _img(v))
    _l = field_validator("ctaUrl")(lambda cls, v: _link(v))

    @field_validator("status")
    @classmethod
    def _s(cls, v):
        if v not in CONTENT_STATUSES:
            raise ValueError(f"status must be one of {CONTENT_STATUSES}")
        return v


def _apply_hero(s: HeroSlide, p: HeroPayload, user: User):
    starts, ends = parse_datetime(p.startsAt), parse_datetime(p.endsAt)
    if starts and ends and ends <= starts:
        raise HTTPException(status_code=400, detail="End date must be after start date")
    s.title, s.eyebrow, s.description, s.watermark = p.title, p.eyebrow, p.description, p.watermark
    s.cta_label, s.cta_url, s.desktop_image, s.mobile_image = p.ctaLabel, p.ctaUrl, p.desktopImage, p.mobileImage
    s.image_alt, s.vehicle_id, s.sort_order = p.imageAlt, p.vehicleId or None, p.sortOrder
    s.starts_at, s.ends_at, s.updated_by = starts, ends, user.username


@router.get("/hero")
def list_hero(user: User = Depends(require_permission("cms:hero")), db: Session = Depends(get_db)):
    rows = db.query(HeroSlide).order_by(HeroSlide.sort_order, HeroSlide.created_at).all()
    return {"slides": [r.to_dict() for r in rows]}


@router.post("/hero", status_code=201)
def create_hero(p: HeroPayload, user: User = Depends(require_permission("cms:hero")), db: Session = Depends(get_db)):
    if p.status != "draft":
        _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    s = HeroSlide(id=new_id("hero"), status=p.status)
    _apply_hero(s, p, user)
    db.add(s)
    db.flush()
    audit(db, user, "hero", s.id, "create", None, s.to_dict())
    _done(db)
    return {"slide": s.to_dict()}


@router.put("/hero/{slide_id}")
def update_hero(slide_id: str, p: HeroPayload, user: User = Depends(require_permission("cms:hero")),
                db: Session = Depends(get_db)):
    s = db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Slide not found")
    # Editing live content or changing status needs publish rights.
    if s.status != "draft" or p.status != "draft":
        _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    before = s.to_dict()
    _apply_hero(s, p, user)
    s.status = p.status
    audit(db, user, "hero", s.id, "update", before, s.to_dict())
    _done(db)
    return {"slide": s.to_dict()}


@router.delete("/hero/{slide_id}")
def delete_hero(slide_id: str, user: User = Depends(require_permission("cms:hero")), db: Session = Depends(get_db)):
    s = db.query(HeroSlide).filter(HeroSlide.id == slide_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Slide not found")
    if s.status == "published":
        _require_publish(user)
    audit(db, user, "hero", s.id, "delete", s.to_dict(), None)
    db.delete(s)
    _done(db)
    return {"success": True}


class ReorderPayload(_Payload):
    ids: List[str] = Field(..., max_length=500)


@router.post("/hero/reorder")
def reorder_hero(p: ReorderPayload, user: User = Depends(require_permission("cms:hero")), db: Session = Depends(get_db)):
    _require_publish(user)
    rows = {r.id: r for r in db.query(HeroSlide).filter(HeroSlide.id.in_(p.ids)).all()}
    for i, sid in enumerate(p.ids):
        if sid in rows:
            rows[sid].sort_order = i
    audit(db, user, "hero", "*", "reorder", None, {"ids": p.ids})
    _done(db)
    return {"success": True}


# ==========================================================================
# Vehicle showcase
# ==========================================================================


class ShowcasePayload(_Payload):
    vehicleId: str = Field(..., max_length=128)
    sortOrder: int = 0
    isVisible: bool = True
    label: Optional[str] = Field(None, max_length=80)
    cardImage: Optional[str] = Field(None, max_length=500)

    _i = field_validator("cardImage")(lambda cls, v: _img(v))


def _showcase_dict(row: FeaturedVehicle, vehicles: Dict[str, Vehicle]) -> Dict[str, Any]:
    d = row.to_dict()
    v = vehicles.get(row.vehicle_id)
    d["vehicle"] = v.to_dict() if v else None
    return d


@router.get("/featured-vehicles")
def list_showcase(user: User = Depends(require_permission("cms:showcase")), db: Session = Depends(get_db)):
    rows = db.query(FeaturedVehicle).order_by(FeaturedVehicle.sort_order, FeaturedVehicle.created_at).all()
    vehicles = {v.id: v for v in db.query(Vehicle).filter(Vehicle.id.in_([r.vehicle_id for r in rows])).all()}
    return {"items": [_showcase_dict(r, vehicles) for r in rows]}


@router.post("/featured-vehicles", status_code=201)
def add_showcase(p: ShowcasePayload, user: User = Depends(require_permission("cms:showcase")), db: Session = Depends(get_db)):
    _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    if db.query(FeaturedVehicle).filter(FeaturedVehicle.vehicle_id == p.vehicleId).first():
        raise HTTPException(status_code=409, detail="This vehicle is already in the showcase")
    if p.sortOrder == 0:
        p.sortOrder = db.query(FeaturedVehicle).count()
    row = FeaturedVehicle(id=new_id("fv"), vehicle_id=p.vehicleId, sort_order=p.sortOrder,
                          is_visible=p.isVisible, label=p.label, card_image=p.cardImage)
    db.add(row)
    db.flush()
    audit(db, user, "showcase", row.id, "create", None, row.to_dict())
    _done(db)
    return {"item": row.to_dict()}


@router.put("/featured-vehicles/{item_id}")
def update_showcase(item_id: str, p: ShowcasePayload, user: User = Depends(require_permission("cms:showcase")),
                    db: Session = Depends(get_db)):
    _require_publish(user)
    row = db.query(FeaturedVehicle).filter(FeaturedVehicle.id == item_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Showcase item not found")
    _vehicle_exists(db, p.vehicleId)
    before = row.to_dict()
    row.vehicle_id, row.sort_order, row.is_visible, row.label, row.card_image = (
        p.vehicleId, p.sortOrder, p.isVisible, p.label, p.cardImage)
    audit(db, user, "showcase", row.id, "update", before, row.to_dict())
    _done(db)
    return {"item": row.to_dict()}


@router.delete("/featured-vehicles/{item_id}")
def delete_showcase(item_id: str, user: User = Depends(require_permission("cms:showcase")), db: Session = Depends(get_db)):
    _require_publish(user)
    row = db.query(FeaturedVehicle).filter(FeaturedVehicle.id == item_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Showcase item not found")
    audit(db, user, "showcase", row.id, "delete", row.to_dict(), None)
    db.delete(row)
    _done(db)
    return {"success": True}


@router.post("/featured-vehicles/reorder")
def reorder_showcase(p: ReorderPayload, user: User = Depends(require_permission("cms:showcase")), db: Session = Depends(get_db)):
    _require_publish(user)
    rows = {r.id: r for r in db.query(FeaturedVehicle).filter(FeaturedVehicle.id.in_(p.ids)).all()}
    for i, rid in enumerate(p.ids):
        if rid in rows:
            rows[rid].sort_order = i
    audit(db, user, "showcase", "*", "reorder", None, {"ids": p.ids})
    _done(db)
    return {"success": True}


# ==========================================================================
# Reviews
# ==========================================================================


class ReviewPayload(_Payload):
    customerName: str = Field(..., min_length=1, max_length=120)
    customerTitle: Optional[str] = Field(None, max_length=160)
    rating: Optional[int] = Field(None, ge=1, le=5)
    body: str = Field(..., min_length=1, max_length=3000)
    photo: Optional[str] = Field(None, max_length=500)
    vehicleId: Optional[str] = Field(None, max_length=128)
    source: str = Field("in-store", max_length=60)
    sourceUrl: Optional[str] = Field(None, max_length=500)
    reviewDate: Optional[str] = None
    status: str = "pending"
    isFeatured: bool = False
    sortOrder: int = 0

    _i = field_validator("photo")(lambda cls, v: _img(v))
    _l = field_validator("sourceUrl")(lambda cls, v: _link(v))

    @field_validator("status")
    @classmethod
    def _s(cls, v):
        if v not in REVIEW_STATUSES:
            raise ValueError(f"status must be one of {REVIEW_STATUSES}")
        return v


def _apply_review(r: Review, p: ReviewPayload):
    r.customer_name, r.customer_title, r.rating, r.body = p.customerName, p.customerTitle, p.rating, p.body
    r.photo, r.vehicle_id, r.source, r.source_url = p.photo, p.vehicleId or None, p.source, p.sourceUrl
    r.review_date = parse_datetime(p.reviewDate) if p.reviewDate else (r.review_date or now_utc())
    r.is_featured, r.sort_order = p.isFeatured, p.sortOrder


@router.get("/reviews")
def list_reviews(status: Optional[str] = None, user: User = Depends(require_permission("cms:reviews")),
                 db: Session = Depends(get_db)):
    q = db.query(Review)
    if status in REVIEW_STATUSES:
        q = q.filter(Review.status == status)
    if status == "approved":
        # Same order as the home-page carousel, so the list can be reordered.
        q = q.order_by(desc(Review.is_featured), Review.sort_order, desc(Review.created_at))
    else:
        q = q.order_by(desc(Review.created_at))
    rows = q.limit(1000).all()
    return {"reviews": [r.to_dict() for r in rows]}


@router.post("/reviews", status_code=201)
def create_review(p: ReviewPayload, user: User = Depends(require_permission("cms:reviews")), db: Session = Depends(get_db)):
    if p.status == "approved":
        _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    r = Review(id=new_id("rev"), status=p.status, moderated_by=user.username)
    _apply_review(r, p)
    db.add(r)
    db.flush()
    audit(db, user, "review", r.id, "create", None, r.to_dict())
    _done(db)
    return {"review": r.to_dict()}


@router.put("/reviews/{review_id}")
def update_review(review_id: str, p: ReviewPayload, user: User = Depends(require_permission("cms:reviews")),
                  db: Session = Depends(get_db)):
    r = db.query(Review).filter(Review.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    if r.status == "approved" or p.status == "approved":
        _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    before = r.to_dict()
    _apply_review(r, p)
    r.status, r.moderated_by = p.status, user.username
    audit(db, user, "review", r.id, "update", before, r.to_dict())
    _done(db)
    return {"review": r.to_dict()}


class ModeratePayload(_Payload):
    status: Optional[str] = None
    isFeatured: Optional[bool] = None


@router.patch("/reviews/{review_id}/moderate")
def moderate_review(review_id: str, p: ModeratePayload, user: User = Depends(require_permission("cms:reviews")),
                    db: Session = Depends(get_db)):
    _require_publish(user)
    r = db.query(Review).filter(Review.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    before = r.to_dict()
    if p.status is not None:
        if p.status not in REVIEW_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        r.status = p.status
    if p.isFeatured is not None:
        r.is_featured = p.isFeatured
    r.moderated_by = user.username
    audit(db, user, "review", r.id, "moderate", before, r.to_dict())
    _done(db)
    return {"review": r.to_dict()}


@router.delete("/reviews/{review_id}")
def delete_review(review_id: str, user: User = Depends(require_permission("cms:reviews")), db: Session = Depends(get_db)):
    r = db.query(Review).filter(Review.id == review_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found")
    if r.status == "approved":
        _require_publish(user)
    audit(db, user, "review", r.id, "delete", r.to_dict(), None)
    db.delete(r)
    _done(db)
    return {"success": True}


@router.post("/reviews/reorder")
def reorder_reviews(p: ReorderPayload, user: User = Depends(require_permission("cms:reviews")), db: Session = Depends(get_db)):
    _require_publish(user)
    rows = {r.id: r for r in db.query(Review).filter(Review.id.in_(p.ids)).all()}
    for i, rid in enumerate(p.ids):
        if rid in rows:
            rows[rid].sort_order = i
    audit(db, user, "review", "*", "reorder", None, {"ids": p.ids})
    _done(db)
    return {"success": True}


# ==========================================================================
# Offers
# ==========================================================================


class OfferPayload(_Payload):
    title: str = Field(..., min_length=3, max_length=200)
    slug: Optional[str] = Field(None, max_length=160)
    summary: Optional[str] = Field(None, max_length=300)
    description: Optional[str] = Field(None, max_length=10000)
    terms: Optional[str] = Field(None, max_length=10000)
    vehicleId: Optional[str] = Field(None, max_length=128)
    discountType: str = "none"
    discountValue: Optional[float] = Field(None, ge=0)
    image: Optional[str] = Field(None, max_length=500)
    ctaLabel: Optional[str] = Field(None, max_length=80)
    startsAt: str
    endsAt: str
    status: str = "draft"
    showOnHome: bool = True
    sortOrder: int = 0

    _i = field_validator("image")(lambda cls, v: _img(v))

    @field_validator("status")
    @classmethod
    def _s(cls, v):
        if v not in OFFER_STATUSES:
            raise ValueError(f"status must be one of {OFFER_STATUSES}")
        return v

    @field_validator("discountType")
    @classmethod
    def _d(cls, v):
        if v not in ("none", "fixed", "percentage"):
            raise ValueError("discountType must be none, fixed or percentage")
        return v


def _apply_offer(db: Session, o: Offer, p: OfferPayload):
    starts, ends = parse_datetime(p.startsAt), parse_datetime(p.endsAt)
    if not starts or not ends:
        raise HTTPException(status_code=400, detail="Start and expiry dates are required")
    if ends <= starts:
        raise HTTPException(status_code=400, detail="Expiry date must be after the start date")
    if p.discountType == "percentage" and (p.discountValue is None or p.discountValue <= 0 or p.discountValue > 90):
        raise HTTPException(status_code=400, detail="Percentage discount must be between 0 and 90")
    if p.discountType == "fixed" and (p.discountValue is None or p.discountValue <= 0):
        raise HTTPException(status_code=400, detail="Fixed discount needs an amount in rupees")
    slug = slugify(p.slug or p.title)
    clash = db.query(Offer).filter(Offer.slug == slug, Offer.id != o.id).first()
    if clash:
        raise HTTPException(status_code=409, detail=f"Another offer already uses the URL /offers/{slug}")
    o.slug, o.title, o.summary, o.description, o.terms = slug, p.title, p.summary, p.description, p.terms
    o.vehicle_id = p.vehicleId or None
    o.discount_type = p.discountType
    o.discount_value = p.discountValue if p.discountType != "none" else None
    o.image, o.cta_label, o.starts_at, o.ends_at = p.image, p.ctaLabel, starts, ends
    o.show_on_home, o.sort_order = p.showOnHome, p.sortOrder


def _offer_admin_dict(o: Offer) -> Dict[str, Any]:
    return o.to_dict(effective_status=offer_effective_status(o))


@router.get("/offers")
def list_offers(user: User = Depends(require_permission("cms:offers")), db: Session = Depends(get_db)):
    rows = db.query(Offer).order_by(Offer.sort_order, desc(Offer.created_at)).all()
    return {"offers": [_offer_admin_dict(o) for o in rows]}


@router.post("/offers", status_code=201)
def create_offer(p: OfferPayload, user: User = Depends(require_permission("cms:offers")), db: Session = Depends(get_db)):
    if p.status != "draft":
        _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    o = Offer(id=new_id("ofr"), status=p.status, author_id=user.id, author_name=user.name or user.username)
    _apply_offer(db, o, p)
    db.add(o)
    db.flush()
    audit(db, user, "offer", o.id, "create", None, _offer_admin_dict(o))
    _done(db)
    return {"offer": _offer_admin_dict(o)}


@router.put("/offers/{offer_id}")
def update_offer(offer_id: str, p: OfferPayload, user: User = Depends(require_permission("cms:offers")),
                 db: Session = Depends(get_db)):
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Offer not found")
    if o.status != "draft" or p.status != "draft":
        _require_publish(user)
    _vehicle_exists(db, p.vehicleId)
    before = _offer_admin_dict(o)
    _apply_offer(db, o, p)
    o.status = p.status
    audit(db, user, "offer", o.id, "update", before, _offer_admin_dict(o))
    _done(db)
    return {"offer": _offer_admin_dict(o)}


class StatusPayload(_Payload):
    status: str


@router.patch("/offers/{offer_id}/status")
def set_offer_status(offer_id: str, p: StatusPayload, user: User = Depends(require_permission("cms:offers")),
                     db: Session = Depends(get_db)):
    _require_publish(user)
    if p.status not in OFFER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Offer not found")
    before = _offer_admin_dict(o)
    o.status = p.status
    audit(db, user, "offer", o.id, f"status:{p.status}", before, _offer_admin_dict(o))
    _done(db)
    return {"offer": _offer_admin_dict(o)}


@router.post("/offers/{offer_id}/duplicate", status_code=201)
def duplicate_offer(offer_id: str, user: User = Depends(require_permission("cms:offers")), db: Session = Depends(get_db)):
    src = db.query(Offer).filter(Offer.id == offer_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Offer not found")
    base = f"{src.slug}-copy"
    slug, n = base, 2
    while db.query(Offer).filter(Offer.slug == slug).first():
        slug, n = f"{base}-{n}", n + 1
    o = Offer(id=new_id("ofr"), slug=slug, title=f"{src.title} (copy)", summary=src.summary,
              description=src.description, terms=src.terms, vehicle_id=src.vehicle_id,
              discount_type=src.discount_type, discount_value=src.discount_value, image=src.image,
              cta_label=src.cta_label, starts_at=src.starts_at, ends_at=src.ends_at, status="draft",
              show_on_home=src.show_on_home, sort_order=src.sort_order, author_id=user.id,
              author_name=user.name or user.username)
    db.add(o)
    db.flush()
    audit(db, user, "offer", o.id, "duplicate", {"from": src.id}, _offer_admin_dict(o))
    _done(db)
    return {"offer": _offer_admin_dict(o)}


@router.delete("/offers/{offer_id}")
def delete_offer(offer_id: str, user: User = Depends(require_permission("cms:offers")), db: Session = Depends(get_db)):
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Offer not found")
    if o.status != "draft":
        _require_publish(user)
    audit(db, user, "offer", o.id, "delete", _offer_admin_dict(o), None)
    db.delete(o)
    _done(db)
    return {"success": True}


# ==========================================================================
# Media library
# ==========================================================================

MEDIA_FOLDERS = ("general", "hero", "offers", "reviews", "vehicles", "brand")
MIN_WIDTH_BY_FOLDER = {"hero": 1200, "offers": 600}


@router.get("/media")
def list_media(folder: Optional[str] = None, q: Optional[str] = None, with_usage: bool = False,
               limit: int = Query(200, ge=1, le=1000),
               user: User = Depends(require_any_permission("cms:media", "cms:hero", "cms:offers", "cms:reviews",
                                                           "cms:showcase", "cms:settings")),
               db: Session = Depends(get_db)):
    query = db.query(MediaAsset)
    if folder in MEDIA_FOLDERS:
        query = query.filter(MediaAsset.folder == folder)
    if q:
        like = f"%{q.strip()[:60]}%"
        query = query.filter((MediaAsset.original_name.ilike(like)) | (MediaAsset.alt.ilike(like)))
    rows = query.order_by(desc(MediaAsset.created_at)).limit(limit).all()
    items = []
    for r in rows:
        d = r.to_dict()
        if with_usage:
            d["usage"] = find_references(db, r.url)
        items.append(d)
    return {"media": items}


@router.post("/videos/upload", status_code=201)
def upload_video(file: UploadFile = File(...), user: User = Depends(require_permission("cms:media")),
                 db: Session = Depends(get_db)):
    """Upload a video: original kept privately, web copy (720p H.264, metadata stripped)
    and a poster image are made. Returns a clip to put into a setting (About or stories)."""
    v = store_video(file)
    poster_url = None
    stored = store_poster(v.pop("posterBytes"), v["name"])
    if stored:
        m = register_media(db, stored, user, "general", original_name=f"{file.filename} (poster)")
        db.flush()
        audit(db, user, "media", m.id, "upload", None, m.to_dict())
        poster_url = stored.url
    db.commit()
    if stored:
        schedule_variants(stored.filename, on_done=mark_variants_ready)
    logger.info("video uploaded by %s: %s (%s s, %d bytes)", user.username, v["src"], v["duration"], v["sizeBytes"])
    return {"video": {"src": v["src"], "poster": poster_url or "", "duration": v["duration"],
                      "width": v["width"], "height": v["height"], "sizeBytes": v["sizeBytes"],
                      "originalBytes": v["originalBytes"], "hasAudio": v["hasAudio"],
                      "uploadedAt": now_utc().isoformat(), "name": "", "caption": "", "car": "", "transcript": ""}}


@router.post("/media/upload", status_code=201)
def upload_media(files: List[UploadFile] = File(...), folder: str = Form("general"), alt: Optional[str] = Form(None),
                 crops: Optional[str] = Form(None, max_length=20000),
                 user: User = Depends(require_permission("cms:media")), db: Session = Depends(get_db)):
    if folder not in MEDIA_FOLDERS:
        folder = "general"
    if len(files) > 20:
        raise HTTPException(status_code=400, detail="Upload at most 20 files at a time")
    created, new_files = [], []
    for f, crop in zip(files, parse_crop_list(crops, len(files))):
        stored = store_image(f, min_width=MIN_WIDTH_BY_FOLDER.get(folder, 0), crop=crop)
        existing = db.query(MediaAsset).filter(MediaAsset.sha256 == stored.sha256).first()
        if existing:
            # Same picture already in the library: reuse it instead of keeping two copies.
            delete_image_files(stored.url)
            created.append({**existing.to_dict(), "duplicate": True})
            continue
        m = register_media(db, stored, user, folder, original_name=f.filename, alt=alt)
        db.flush()
        audit(db, user, "media", m.id, "upload", None, m.to_dict())
        created.append(m.to_dict())
        new_files.append(stored.filename)
    db.commit()
    for name in new_files:
        schedule_variants(name, on_done=mark_variants_ready)
    return {"media": created}


class MediaPatch(_Payload):
    alt: Optional[str] = Field(None, max_length=300)
    folder: Optional[str] = None


@router.patch("/media/{media_id}")
def update_media(media_id: str, p: MediaPatch, user: User = Depends(require_permission("cms:media")),
                 db: Session = Depends(get_db)):
    m = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    before = m.to_dict()
    if p.alt is not None:
        m.alt = p.alt or None
    if p.folder in MEDIA_FOLDERS:
        m.folder = p.folder
    audit(db, user, "media", m.id, "update", before, m.to_dict())
    _done(db)
    return {"media": m.to_dict()}


@router.get("/media/{media_id}/usage")
def media_usage(media_id: str, user: User = Depends(require_permission("cms:media")), db: Session = Depends(get_db)):
    m = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    return {"usage": find_references(db, m.url)}


def _replace_url_everywhere(db: Session, old: str, new: str):
    for v in db.query(Vehicle).all():
        if old in (v.images or []):
            v.images = [new if u == old else u for u in v.images]
    for s in db.query(HeroSlide).all():
        if s.desktop_image == old:
            s.desktop_image = new
        if s.mobile_image == old:
            s.mobile_image = new
    db.query(Offer).filter(Offer.image == old).update({Offer.image: new})
    db.query(Review).filter(Review.photo == old).update({Review.photo: new})
    db.query(FeaturedVehicle).filter(FeaturedVehicle.card_image == old).update({FeaturedVehicle.card_image: new})
    for row in db.query(SiteSetting).all():
        for attr in ("draft_value", "published_value"):
            val = getattr(row, attr)
            if val is None:
                continue
            blob = json.dumps(val)
            if f'"{old}"' in blob:
                setattr(row, attr, json.loads(blob.replace(f'"{old}"', f'"{new}"')))


@router.post("/media/{media_id}/replace")
def replace_media(media_id: str, file: UploadFile = File(...), user: User = Depends(require_permission("cms:media")),
                  db: Session = Depends(get_db)):
    """Upload a new file and point every place that used the old one at it."""
    m = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    refs = find_references(db, m.url)
    if any(r.get("status") in ("published", "approved") or r["type"] in ("vehicle", "settings", "showcase") for r in refs):
        _require_publish(user)
    stored = store_image(file, min_width=MIN_WIDTH_BY_FOLDER.get(m.folder, 0))
    before = m.to_dict()
    old_url = m.url
    _replace_url_everywhere(db, old_url, stored.url)
    m.url, m.filename, m.mime_type = stored.url, stored.filename, stored.mime_type
    m.width, m.height, m.size_bytes, m.sha256 = stored.width, stored.height, stored.size_bytes, stored.sha256
    m.original_path, m.original_bytes, m.placeholder = stored.original_path, stored.original_bytes, stored.placeholder
    m.variants_ready = False
    m.original_name = (file.filename or "")[:255]
    audit(db, user, "media", m.id, "replace", before, m.to_dict())
    _done(db)
    delete_image_files(old_url)
    schedule_variants(stored.filename, on_done=mark_variants_ready)
    return {"media": m.to_dict(), "updatedReferences": len(refs)}


@router.delete("/media/{media_id}")
def delete_media(media_id: str, user: User = Depends(require_permission("cms:media")), db: Session = Depends(get_db)):
    m = db.query(MediaAsset).filter(MediaAsset.id == media_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    refs = find_references(db, m.url)
    if refs:
        raise HTTPException(status_code=409, detail={"message": "This image is still in use. Remove it from these places first.",
                                                     "usage": refs})
    audit(db, user, "media", m.id, "delete", m.to_dict(), None)
    url = m.url
    db.delete(m)
    _done(db)
    delete_image_files(url)
    return {"success": True}


# ==========================================================================
# Site settings (draft → publish)
# ==========================================================================


def _validate_setting(key: str, value: Any) -> Any:
    default = DEFAULT_SETTINGS[key]
    if type(value) is not type(default):
        raise HTTPException(status_code=400, detail=f"Setting '{key}' must be a {type(default).__name__}")
    if len(json.dumps(value)) > 100_000:
        raise HTTPException(status_code=400, detail="Setting is too large")
    if key == "homepage":
        services = value.get("services") or {}
        if not isinstance(services, dict) or not isinstance(services.get("items", []), list) or len(services.get("items", [])) > 12:
            raise HTTPException(status_code=400, detail="Services must have at most 12 items")
        collections = value.get("collections") or []
        if not isinstance(collections, list) or len(collections) > 12:
            raise HTTPException(status_code=400, detail="Collections must have at most 12 rows")
        velocity = value.get("velocity") or {"lines": [], "brandLine": False}
        why = value.get("whyUs") or []
        if (not isinstance(velocity, dict) or not isinstance(velocity.get("lines", []), list)
                or len(velocity.get("lines", [])) > 3
                or any(not isinstance(x, str) or len(x) > 120 for x in velocity.get("lines", []))):
            raise HTTPException(status_code=400, detail="The moving text band takes up to 3 lines of at most 120 characters")
        if not isinstance(why, list) or len(why) > 6:
            raise HTTPException(status_code=400, detail="'Why buy from us' takes at most 6 cards")
        try:
            for it in why:
                if not isinstance(it, dict) or not str(it.get("title", "")).strip():
                    raise ValueError("Each 'Why buy from us' card needs a title")
                if len(str(it.get("text", ""))) > 400:
                    raise ValueError("Card text is limited to 400 characters")
                _img(it.get("image"))
            for it in services.get("items", []):
                if not isinstance(it, dict) or not str(it.get("title", "")).strip():
                    raise ValueError("Each service needs a title")
                _img(it.get("image")); _link(it.get("link"))
            if services.get("ctaUrl"):
                _link(services["ctaUrl"])
            for it in collections:
                if not isinstance(it, dict) or not str(it.get("label", "")).strip():
                    raise ValueError("Each collection row needs a label")
                _img(it.get("image")); _link(it.get("link"))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        stories = value.get("videoStories") or []
        if not isinstance(stories, list) or len(stories) > 12:
            raise HTTPException(status_code=400, detail="Customer stories take at most 12 videos")
        try:
            for it in stories:
                _video_clip(it, required=True)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        known = {s["id"] for s in default["sections"]}
        sections = value.get("sections") or []
        if not isinstance(sections, list) or any(not isinstance(s, dict) or s.get("id") not in known for s in sections):
            raise HTTPException(status_code=400, detail="Unknown homepage section")
        for s in sections:
            if "limit" in s and s["limit"] not in (None, ""):
                try:
                    s["limit"] = max(1, min(int(s["limit"]), 50))
                except (TypeError, ValueError):
                    raise HTTPException(status_code=400, detail="Section limit must be a number")
    if key == "general":
        value.pop("aboutVideo", None)  # replaced by aboutVideos
        clips = value.get("aboutVideos") or []
        if not isinstance(clips, list) or len(clips) > 6:
            raise HTTPException(status_code=400, detail="The About page takes at most 6 videos")
        try:
            for it in clips:
                _video_clip(it, required=True)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        value["aboutStories"] = value.get("aboutStories") is not False
    if key == "seo" and value.get("defaultOgImage"):
        try:
            _img(value["defaultOgImage"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    if key == "social":
        for k, v in value.items():
            if v and not str(v).startswith("https://"):
                raise HTTPException(status_code=400, detail=f"Social link '{k}' must start with https://")
    if key == "faq":
        if len(value) > 40 or any(not isinstance(i, dict) or not i.get("question") or not i.get("answer") for i in value):
            raise HTTPException(status_code=400, detail="Each FAQ needs a question and an answer (max 40)")
    if key == "contact":
        if value.get("mapUrl") and not str(value["mapUrl"]).startswith("https://"):
            raise HTTPException(status_code=400, detail="Map link must start with https://")
        if value.get("email") and not re.match(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$", str(value["email"])):
            raise HTTPException(status_code=400, detail="Enter a valid email address")
        for p in value.get("phones") or []:
            if not isinstance(p, dict) or not re.match(r"^\+?[0-9]{6,15}$", str(p.get("number", ""))):
                raise HTTPException(status_code=400, detail="Phone numbers may contain digits and a leading + only")
        if value.get("whatsapp") and not re.match(r"^[0-9]{8,15}$", str(value["whatsapp"])):
            raise HTTPException(status_code=400, detail="WhatsApp number must be digits with country code")
        for c in ("latitude", "longitude"):
            if value.get(c) not in (None, "") and not isinstance(value[c], (int, float)):
                raise HTTPException(status_code=400, detail=f"{c} must be a number")
    if key == "general":
        ann = value.get("announcement") or {}
        if ann.get("link"):
            try:
                _link(ann["link"])
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
    return value


@router.get("/site-settings")
def admin_get_settings(user: User = Depends(require_permission("cms:settings")), db: Session = Depends(get_db)):
    rows = {r.key: r for r in db.query(SiteSetting).filter(SiteSetting.key.in_(SETTING_KEYS)).all()}
    draft, published = get_settings(db, draft=True), get_settings(db, draft=False)
    meta = {k: {"updatedBy": r.updated_by, "publishedBy": r.published_by,
                "updatedAt": r.updated_at.isoformat() if r.updated_at else None,
                "publishedAt": r.published_at.isoformat() if r.published_at else None,
                "hasUnpublishedChanges": r.draft_value != r.published_value} for k, r in rows.items()}
    return {"draft": draft, "published": published, "meta": meta, "keys": list(SETTING_KEYS)}


@router.put("/site-settings/{key}")
def admin_save_setting_draft(key: str, value: Any = Body(...), user: User = Depends(require_permission("cms:settings")),
                             db: Session = Depends(get_db)):
    if key not in SETTING_KEYS:
        raise HTTPException(status_code=404, detail="Unknown setting")
    value = _validate_setting(key, value)
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if not row:
        row = SiteSetting(key=key, published_value=copy.deepcopy(DEFAULT_SETTINGS[key]))
        db.add(row)
    before = row.draft_value
    row.draft_value = value
    row.updated_by = user.username
    row.updated_at = now_utc()
    audit(db, user, "settings", key, "save-draft", before, value)
    _done(db)
    return {"success": True, "key": key, "draft": value}


class PublishSettingsPayload(_Payload):
    keys: Optional[List[str]] = None


@router.post("/site-settings/publish")
def admin_publish_settings(p: PublishSettingsPayload, user: User = Depends(require_permission("cms:settings")),
                           db: Session = Depends(get_db)):
    _require_publish(user)
    keys = [k for k in (p.keys or SETTING_KEYS) if k in SETTING_KEYS]
    published = []
    for row in db.query(SiteSetting).filter(SiteSetting.key.in_(keys)).all():
        if row.draft_value is not None and row.draft_value != row.published_value:
            audit(db, user, "settings", row.key, "publish", row.published_value, row.draft_value)
            row.published_value = copy.deepcopy(row.draft_value)
            row.published_by = user.username
            row.published_at = now_utc()
            published.append(row.key)
    _done(db)
    return {"success": True, "published": published}


@router.post("/site-settings/discard")
def admin_discard_settings(p: PublishSettingsPayload, user: User = Depends(require_permission("cms:settings")),
                           db: Session = Depends(get_db)):
    keys = [k for k in (p.keys or SETTING_KEYS) if k in SETTING_KEYS]
    for row in db.query(SiteSetting).filter(SiteSetting.key.in_(keys)).all():
        if row.draft_value != row.published_value:
            audit(db, user, "settings", row.key, "discard-draft", row.draft_value, row.published_value)
            row.draft_value = copy.deepcopy(row.published_value)
    _done(db)
    return {"success": True}


# ==========================================================================
# Content audit log
# ==========================================================================


@router.get("/content-audit")
def content_audit(entity_type: Optional[str] = None, entity_id: Optional[str] = None,
                  limit: int = Query(200, ge=1, le=1000),
                  user: User = Depends(require_any_permission("logs:view", "cms:settings")),
                  db: Session = Depends(get_db)):
    q = db.query(ContentAuditLog)
    if entity_type:
        q = q.filter(ContentAuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(ContentAuditLog.entity_id == entity_id)
    rows = q.order_by(desc(ContentAuditLog.timestamp)).limit(limit).all()
    return {"entries": [r.to_dict() for r in rows]}
