import json
import re
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form, Response
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session

from backend.cms.images import store_image, delete_image_files, parse_crop_list
from backend.cms.media_registry import register_media, after_commit_generate
from backend.cms.references import url_is_referenced
from backend.cms.service import content_cache, invalidate_content
from backend.cms.public_content import brand_slug
from backend.seo import indexnow
from backend.database import get_db
from backend.models import Vehicle, User, MediaAsset, VEHICLE_STATUSES
from backend.permissions import has_permission
from backend.security import require_permission, log_activity, get_client_ip

router = APIRouter(prefix="/api", tags=["Vehicles & Uploads"])

MAX_IMAGES_PER_VEHICLE = 30
MAX_PHOTOS_PER_REQUEST = 20
SAFE_IMAGE_URL = re.compile(r"^(/uploads/[A-Za-z0-9_.-]+|https://[A-Za-z0-9.-]+/[^\s\"'<>]*)$")


def _save_photos(db: Session, photos: List[UploadFile], user: User, crops: Optional[str] = None) -> List[str]:
    files = [f for f in photos or [] if f.filename]
    if len(files) > MAX_PHOTOS_PER_REQUEST:
        raise HTTPException(status_code=400, detail=f"Upload at most {MAX_PHOTOS_PER_REQUEST} photos at a time")
    crop_list = parse_crop_list(crops, len(files))
    urls = []
    for file, crop in zip(files, crop_list):
        stored = store_image(file, crop=crop)
        register_media(db, stored, user, "vehicles", original_name=file.filename)
        urls.append(stored.url)
    return urls


def _filenames(urls: List[str]) -> List[str]:
    return [u[len("/uploads/"):] for u in urls if u.startswith("/uploads/")]


def _parse_url_list(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        items = json.loads(raw)
        if not isinstance(items, list):
            items = []
    except Exception:
        items = [s.strip() for s in raw.split(",")]
    out = []
    for u in items:
        if isinstance(u, str) and SAFE_IMAGE_URL.match(u.strip()):
            out.append(u.strip())
    return out


def _parse_list(raw: Optional[str]) -> List[str]:
    if raw is None:
        return []
    try:
        val = json.loads(raw)
        if isinstance(val, list):
            return [str(x).strip()[:300] for x in val if str(x).strip()][:40]
    except Exception:
        pass
    return [s.strip()[:300] for s in raw.split("\n") if s.strip()][:40]


def _parse_colors(raw: Optional[str]):
    try:
        val = json.loads(raw or "[]")
    except Exception:
        return None
    colors = []
    for c in val if isinstance(val, list) else []:
        if isinstance(c, dict) and c.get("name"):
            hexv = str(c.get("hex", "#111111"))
            if not re.match(r"^#[0-9A-Fa-f]{3,8}$", hexv):
                hexv = "#111111"
            colors.append({"name": str(c["name"])[:60], "hex": hexv})
    return colors[:12]


def _opt_int(value: Optional[str], lo: int, hi: int, field: str) -> Optional[int]:
    if value is None or str(value).strip() == "":
        return None
    try:
        n = int(float(value))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"{field} must be a number")
    if n < lo or n > hi:
        raise HTTPException(status_code=400, detail=f"{field} must be between {lo} and {hi}")
    return n


def _check_status(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    if value not in VEHICLE_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {', '.join(VEHICLE_STATUSES)}")
    return value


def _truthy(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None
    return str(value).lower() in ("1", "true", "yes", "on")


def _public_query(db: Session):
    return db.query(Vehicle).filter(Vehicle.is_published.is_(True))


# ==========================================
# Public endpoints
# ==========================================


def _listing_paths(v: Vehicle) -> list:
    """The car's page plus the listings it appears on (all cars, its brand, its collections)."""
    from backend.seo.listing import COLLECTIONS, collection_path
    d = v.to_dict(public=True)
    return ([f"/cars/{v.id}", "/cars", f"/brands/{brand_slug(v.brand)}"]
            + [collection_path(c.slug) for c in COLLECTIONS if c.match(d)])


def _with_summary(v: Vehicle, db: Session) -> dict:
    """Public car data plus a one-paragraph, answer-first summary built only from its fields."""
    from backend.cms.service import public_settings
    from backend.seo.listing import vehicle_summary
    d = v.to_dict(public=True)
    s = content_cache.get_or_set("settings:public", lambda: {"settings": public_settings(db)})["settings"]
    d["summary"] = vehicle_summary(d, s["contact"].get("city") or "Lucknow",
                                   s["general"].get("siteName") or "Exotique Machines",
                                   s["contact"].get("locality") or None)
    return d


@router.get("/vehicles")
def get_vehicles(
    response: Response,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    fuel: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    def build():
        query = _public_query(db)
        if category and category.lower() != "all":
            query = query.filter(Vehicle.category == category)
        if brand and brand.lower() != "all":
            query = query.filter(Vehicle.brand.ilike(brand))
        if fuel and fuel.lower() != "all":
            query = query.filter(Vehicle.fuel.ilike(fuel))
        if search and search.strip():
            q = f"%{search.strip()[:80]}%"
            query = query.filter(or_(Vehicle.brand.ilike(q), Vehicle.model.ilike(q),
                                     Vehicle.type.ilike(q), Vehicle.badge.ilike(q)))
        vehicles = query.order_by(desc(Vehicle.created_at)).all()
        return {"success": True, "count": len(vehicles), "vehicles": [_with_summary(v, db) for v in vehicles]}

    key = f"vehicles:{category}:{brand}:{fuel}:{(search or '')[:80]}"
    response.headers["Cache-Control"] = "public, max-age=30"
    return content_cache.get_or_set(key, build)


@router.get("/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: str, response: Response, db: Session = Depends(get_db)):
    vehicle = _public_query(db).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    response.headers["Cache-Control"] = "public, max-age=30"
    return {"success": True, "vehicle": _with_summary(vehicle, db)}


# ==========================================
# Admin endpoints
# ==========================================


@router.get("/admin/vehicles")
def admin_list_vehicles(current_user: User = Depends(require_permission("inventory:view")),
                        db: Session = Depends(get_db)):
    vehicles = db.query(Vehicle).order_by(desc(Vehicle.created_at)).all()
    return {"success": True, "count": len(vehicles), "vehicles": [v.to_dict() for v in vehicles]}


@router.post("/upload")
def upload_images(photos: List[UploadFile] = File(...),
                  photoCrops: Optional[str] = Form(None, max_length=20000),
                  current_user: User = Depends(require_permission("cms:media")),
                  db: Session = Depends(get_db)):
    if not photos:
        raise HTTPException(status_code=400, detail="No image files uploaded")
    urls = _save_photos(db, photos, current_user, photoCrops)
    db.commit()
    after_commit_generate(_filenames(urls))
    return {"success": True, "urls": urls, "count": len(urls)}


@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
def create_vehicle(
    request: Request,
    brand: str = Form(..., max_length=100),
    model: str = Form(..., max_length=100),
    price: float = Form(..., gt=0, lt=100000),
    badge: Optional[str] = Form(None, max_length=100),
    type: Optional[str] = Form(None, max_length=100),
    category: Optional[str] = Form(None),
    lifestyle: Optional[str] = Form("SUV", max_length=50),
    fuel: Optional[str] = Form("Petrol", max_length=50),
    transmission: Optional[str] = Form("Automatic", max_length=50),
    emi: Optional[int] = Form(None, ge=0),
    seats: Optional[int] = Form(5, ge=1, le=20),
    engine: Optional[str] = Form("", max_length=200),
    power: Optional[str] = Form("", max_length=200),
    mileage: Optional[str] = Form("", max_length=200),
    description: Optional[str] = Form(None, max_length=5000),
    features: Optional[str] = Form(None, max_length=20000),
    colors: Optional[str] = Form(None, max_length=5000),
    imageUrls: Optional[str] = Form(None, max_length=20000),
    year: Optional[str] = Form(None),
    kmDriven: Optional[str] = Form(None),
    owners: Optional[str] = Form(None),
    registration: Optional[str] = Form(None, max_length=40),
    condition: Optional[str] = Form("used"),
    status_: Optional[str] = Form("available", alias="status"),
    isPublished: Optional[str] = Form("true"),
    photos: List[UploadFile] = File(default=[]),
    photoCrops: Optional[str] = Form(None, max_length=20000),
    current_user: User = Depends(require_permission("inventory:create")),
    db: Session = Depends(get_db),
):
    brand_clean, model_clean = brand.strip(), model.strip()
    if not brand_clean or not model_clean:
        raise HTTPException(status_code=400, detail="Brand and Model are required")
    if category not in (None, "", "premium", "non-premium"):
        raise HTTPException(status_code=400, detail="category must be premium or non-premium")
    cat = category or ("premium" if price > 25 else "non-premium")
    calculated_emi = emi if emi else int(round((price * 100000 * 0.015) / 100) * 100)
    this_year = datetime.date.today().year
    year_v = _opt_int(year, 1950, this_year + 1, "Year")

    new_urls = _save_photos(db, photos, current_user, photoCrops)
    images_list = new_urls + _parse_url_list(imageUrls)
    if len(images_list) > MAX_IMAGES_PER_VEHICLE:
        raise HTTPException(status_code=400, detail=f"A vehicle can have at most {MAX_IMAGES_PER_VEHICLE} images")

    base_slug = re.sub(r"[^a-z0-9]+", "-", f"{brand_clean}-{model_clean}-{year_v or ''}".lower()).strip("-")[:110]
    vehicle_id, counter = base_slug, 1
    while db.query(Vehicle).filter(Vehicle.id == vehicle_id).first():
        vehicle_id = f"{base_slug}-{counter}"
        counter += 1

    v = Vehicle(
        id=vehicle_id,
        brand=brand_clean,
        model=model_clean,
        badge=(badge or "").strip() or model_clean,
        type=(type or "").strip() or ("Luxury SUV" if cat == "premium" else "SUV"),
        category=cat,
        lifestyle=lifestyle or "SUV",
        fuel=fuel or "Petrol",
        transmission=transmission or "Automatic",
        price=price,
        emi=calculated_emi,
        seats=seats or 5,
        engine=(engine or "").strip(),
        power=(power or "").strip(),
        mileage=(mileage or "").strip(),
        images=images_list,
        colors=_parse_colors(colors) or [],
        description=(description or "").strip() or f"{year_v or ''} {brand_clean} {model_clean} available at Exotique Machines, Lucknow.".strip(),
        features=_parse_list(features),
        rating=None,
        is_recent=True,
        year=year_v,
        km_driven=_opt_int(kmDriven, 0, 2_000_000, "Kilometres driven"),
        owners=_opt_int(owners, 0, 20, "Owners"),
        registration=(registration or "").strip().upper() or None,
        condition="new" if condition == "new" else "used",
        status=_check_status(status_) or "available",
        is_published=_truthy(isPublished) is not False,
        created_at=datetime.datetime.now(datetime.timezone.utc),
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    after_commit_generate(_filenames(new_urls))
    invalidate_content()
    if v.is_published:
        indexnow.notify(_listing_paths(v))
    log_activity(db, action="VEHICLE_CREATED", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=f"{v.brand} {v.model} ({v.id})",
                 details=f"Price Rs {v.price} Lakhs ({v.category}); published={v.is_published}", ip=get_client_ip(request))
    return {"success": True, "message": "Vehicle added successfully", "vehicle": v.to_dict()}


@router.put("/vehicles/{vehicle_id}")
def update_vehicle(
    vehicle_id: str,
    request: Request,
    brand: Optional[str] = Form(None, max_length=100),
    model: Optional[str] = Form(None, max_length=100),
    price: Optional[float] = Form(None, gt=0, lt=100000),
    badge: Optional[str] = Form(None, max_length=100),
    type: Optional[str] = Form(None, max_length=100),
    category: Optional[str] = Form(None),
    lifestyle: Optional[str] = Form(None, max_length=50),
    fuel: Optional[str] = Form(None, max_length=50),
    transmission: Optional[str] = Form(None, max_length=50),
    emi: Optional[int] = Form(None, ge=0),
    seats: Optional[int] = Form(None, ge=1, le=20),
    engine: Optional[str] = Form(None, max_length=200),
    power: Optional[str] = Form(None, max_length=200),
    mileage: Optional[str] = Form(None, max_length=200),
    description: Optional[str] = Form(None, max_length=5000),
    features: Optional[str] = Form(None, max_length=20000),
    colors: Optional[str] = Form(None, max_length=5000),
    imageUrls: Optional[str] = Form(None, max_length=20000),
    replaceImages: Optional[str] = Form(None),
    year: Optional[str] = Form(None),
    kmDriven: Optional[str] = Form(None),
    owners: Optional[str] = Form(None),
    registration: Optional[str] = Form(None, max_length=40),
    condition: Optional[str] = Form(None),
    status_: Optional[str] = Form(None, alias="status"),
    isPublished: Optional[str] = Form(None),
    photos: List[UploadFile] = File(default=[]),
    photoCrops: Optional[str] = Form(None, max_length=20000),
    current_user: User = Depends(require_permission("inventory:edit")),
    db: Session = Depends(get_db),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if price is not None and float(price) != vehicle.price:
        if not has_permission(current_user, "pricing:edit"):
            raise HTTPException(status_code=403, detail='Access denied: the "pricing:edit" permission is required to change prices.')
        vehicle.price = float(price)
    if emi is not None and int(emi) != vehicle.emi:
        if not has_permission(current_user, "pricing:edit"):
            raise HTTPException(status_code=403, detail='Access denied: the "pricing:edit" permission is required to change EMI.')
        vehicle.emi = int(emi)

    if category is not None:
        if category not in ("premium", "non-premium"):
            raise HTTPException(status_code=400, detail="category must be premium or non-premium")
        vehicle.category = category
    for attr, val in (("brand", brand), ("model", model), ("badge", badge), ("type", type), ("lifestyle", lifestyle),
                      ("fuel", fuel), ("transmission", transmission), ("engine", engine), ("power", power),
                      ("mileage", mileage), ("description", description)):
        if val is not None:
            setattr(vehicle, attr, val.strip())
    if seats is not None:
        vehicle.seats = int(seats)
    this_year = datetime.date.today().year
    if year is not None:
        vehicle.year = _opt_int(year, 1950, this_year + 1, "Year")
    if kmDriven is not None:
        vehicle.km_driven = _opt_int(kmDriven, 0, 2_000_000, "Kilometres driven")
    if owners is not None:
        vehicle.owners = _opt_int(owners, 0, 20, "Owners")
    if registration is not None:
        vehicle.registration = registration.strip().upper() or None
    if condition is not None:
        vehicle.condition = "new" if condition == "new" else "used"
    if status_ is not None:
        vehicle.status = _check_status(status_)
    if isPublished is not None:
        vehicle.is_published = bool(_truthy(isPublished))

    new_urls = _save_photos(db, photos, current_user, photoCrops)
    if replaceImages == "true":
        # The admin sent the full, ordered list of photos to keep; new uploads go last.
        current_images = _parse_url_list(imageUrls) + new_urls
    else:
        current_images = list(vehicle.images or []) + new_urls + _parse_url_list(imageUrls)
    seen, ordered = set(), []
    for u in current_images:  # de-duplicate while keeping order
        if u not in seen:
            seen.add(u)
            ordered.append(u)
    if len(ordered) > MAX_IMAGES_PER_VEHICLE:
        raise HTTPException(status_code=400, detail=f"A vehicle can have at most {MAX_IMAGES_PER_VEHICLE} images")
    vehicle.images = ordered

    if features is not None:
        vehicle.features = _parse_list(features)
    if colors is not None:
        parsed = _parse_colors(colors)
        if parsed is not None:
            vehicle.colors = parsed

    vehicle.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(vehicle)
    after_commit_generate(_filenames(new_urls))
    invalidate_content()
    indexnow.notify(_listing_paths(vehicle))
    log_activity(db, action="VEHICLE_UPDATED", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=f"{vehicle.brand} {vehicle.model} ({vehicle.id})",
                 details=f"Price Rs {vehicle.price} Lakhs; status={vehicle.status}; published={vehicle.is_published}",
                 ip=get_client_ip(request))
    return {"success": True, "message": "Vehicle updated successfully", "vehicle": vehicle.to_dict()}


@router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: str, request: Request,
                   current_user: User = Depends(require_permission("inventory:delete")),
                   db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    brand_name, model_name = vehicle.brand, vehicle.model
    db.delete(vehicle)
    db.commit()
    # Photos are deliberately kept: they stay in the media library (with their preserved
    # originals) and can be removed there once nothing uses them.
    invalidate_content()
    indexnow.notify([f"/cars/{vehicle_id}", "/cars", f"/brands/{brand_slug(brand_name)}"])
    log_activity(db, action="VEHICLE_DELETED", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=f"{brand_name} {model_name} ({vehicle_id})",
                 details="Vehicle permanently removed.", ip=get_client_ip(request))
    return {"success": True, "message": f"{brand_name} {model_name} deleted successfully", "deletedId": vehicle_id}
