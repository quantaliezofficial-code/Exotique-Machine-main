import os
import re
import json
import time
import uuid
import datetime
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from backend.config import settings
from backend.database import get_db
from backend.models import Vehicle, User
from backend.security import (
    require_permission,
    get_current_user,
    log_activity
)
from backend.routes.auth import get_client_ip

router = APIRouter(prefix="/api", tags=["Vehicles & Uploads"])

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15MB


def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded image file securely and return its /uploads/ URL."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only image files (JPG, PNG, WEBP, GIF, SVG) are permitted")

    orig_stem = Path(file.filename or "image").stem
    clean_stem = re.sub(r"[^a-zA-Z0-9_-]", "_", orig_stem)
    unique_suffix = f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
    filename = f"{clean_stem}-{unique_suffix}{ext or '.jpg'}"

    target_path = settings.UPLOADS_DIR / filename
    contents = file.file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum permitted limit (15MB).")

    with open(target_path, "wb") as f:
        f.write(contents)

    return f"/uploads/{filename}"


# ==========================================
# Vehicle Fleet Public Endpoints
# ==========================================

@router.get("/vehicles")
def get_vehicles(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    fuel: Optional[str] = None,
    search: Optional[str] = None,
    recent: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Vehicle)

    if category and category.lower() != "all":
        query = query.filter(Vehicle.category == category)

    if brand and brand.lower() != "all":
        query = query.filter(Vehicle.brand.ilike(brand))

    if fuel and fuel.lower() != "all":
        query = query.filter(Vehicle.fuel.ilike(fuel))

    if search and search.strip():
        q = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Vehicle.brand.ilike(q),
                Vehicle.model.ilike(q),
                Vehicle.type.ilike(q),
                Vehicle.badge.ilike(q)
            )
        )

    if recent == "true":
        query = query.order_by(desc(Vehicle.created_at))
    else:
        query = query.order_by(desc(Vehicle.created_at))

    vehicles = query.all()
    return {
        "success": True,
        "count": len(vehicles),
        "vehicles": [v.to_dict() for v in vehicles]
    }


@router.get("/vehicles/{vehicle_id}")
def get_vehicle(vehicle_id: str, db: Session = Depends(get_db)):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"success": True, "vehicle": vehicle.to_dict()}


# ==========================================
# Standalone Image Upload
# ==========================================

@router.post("/upload")
def upload_images(
    photos: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user)
):
    if not photos or len(photos) == 0:
        raise HTTPException(status_code=400, detail="No image files uploaded")

    saved_urls = []
    for file in photos:
        url = save_uploaded_file(file)
        saved_urls.append(url)

    return {
        "success": True,
        "urls": saved_urls,
        "count": len(saved_urls)
    }


# ==========================================
# Create Vehicle (Requires inventory:create)
# ==========================================

@router.post("/vehicles", status_code=status.HTTP_201_CREATED)
def create_vehicle(
    request: Request,
    brand: str = Form(...),
    model: str = Form(...),
    price: float = Form(...),
    badge: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    lifestyle: Optional[str] = Form("SUV"),
    fuel: Optional[str] = Form("Petrol"),
    transmission: Optional[str] = Form("Automatic"),
    emi: Optional[int] = Form(None),
    seats: Optional[int] = Form(5),
    engine: Optional[str] = Form("Performance Powertrain"),
    power: Optional[str] = Form("Certified Performance"),
    mileage: Optional[str] = Form("Verified Showroom Mileage"),
    description: Optional[str] = Form(None),
    features: Optional[str] = Form(None),
    colors: Optional[str] = Form(None),
    imageUrls: Optional[str] = Form(None),
    rating: Optional[float] = Form(5.0),
    photos: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_permission("inventory:create")),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)

    if not brand.strip() or not model.strip():
        raise HTTPException(status_code=400, detail="Brand and Model are required")

    brand_clean = brand.strip()
    model_clean = model.strip()

    cat = category if category else ("premium" if price > 25 else "non-premium")
    calculated_emi = emi if emi else int(round((price * 100000 * 0.015) / 100) * 100)

    # Parse features
    parsed_features = []
    if features:
        try:
            parsed_features = json.loads(features)
        except Exception:
            parsed_features = [s.strip() for s in features.split("\n") if s.strip()]
    if not parsed_features:
        parsed_features = [
            "120-Point Certified Inspection",
            "Single Ownership History",
            "Original OEM Spares Only"
        ]

    # Parse colors
    parsed_colors = []
    if colors:
        try:
            parsed_colors = json.loads(colors)
        except Exception:
            parsed_colors = [{"name": "Standard Showroom Finish", "hex": "#111111"}]
    if not parsed_colors:
        parsed_colors = [
            {"name": "Obsidian Black", "hex": "#0B0C0E"},
            {"name": "Polar White", "hex": "#FDFCFA"}
        ]

    # Handle images
    images_list = []
    if photos:
        for file in photos:
            if file.filename:
                images_list.append(save_uploaded_file(file))

    if imageUrls:
        try:
            extra = json.loads(imageUrls)
            if isinstance(extra, list):
                images_list.extend(extra)
        except Exception:
            images_list.extend([s.strip() for s in imageUrls.split(",") if s.strip()])

    if not images_list:
        images_list = [
            "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&q=80&w=1200"
        ]

    # Generate unique slug ID
    base_slug = re.sub(r"[^a-z0-9]+", "-", f"{brand_clean}-{model_clean}".lower()).strip("-")
    vehicle_id = base_slug
    counter = 1
    while db.query(Vehicle).filter(Vehicle.id == vehicle_id).first():
        vehicle_id = f"{base_slug}-{counter}"
        counter += 1

    new_vehicle = Vehicle(
        id=vehicle_id,
        brand=brand_clean,
        model=model_clean,
        badge=badge.strip() if badge else f"{model_clean} Edition",
        type=type.strip() if type else ("Luxury SUV" if cat == "premium" else "Compact SUV"),
        category=cat,
        lifestyle=lifestyle or "SUV",
        fuel=fuel or "Petrol",
        transmission=transmission or "Automatic",
        price=price,
        emi=calculated_emi,
        seats=seats or 5,
        engine=engine.strip() if engine else "Performance Powertrain",
        power=power.strip() if power else "Certified Performance",
        mileage=mileage.strip() if mileage else "Verified Showroom Mileage",
        images=images_list,
        colors=parsed_colors,
        description=description.strip() if description else f"Exotique Machines certified {brand_clean} {model_clean} in pristine condition.",
        features=parsed_features,
        rating=rating or 5.0,
        is_recent=True,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )

    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="VEHICLE_CREATED",
        target=f"{new_vehicle.brand} {new_vehicle.model} ({new_vehicle.id})",
        details=f"Added new vehicle priced at ₹{new_vehicle.price} Lakhs ({new_vehicle.category}).",
        ip=client_ip
    )

    return {
        "success": True,
        "message": "Vehicle added successfully",
        "vehicle": new_vehicle.to_dict()
    }


# ==========================================
# Update Vehicle (Requires inventory:edit & pricing:edit if price changed)
# ==========================================

@router.put("/vehicles/{vehicle_id}")
def update_vehicle(
    vehicle_id: str,
    request: Request,
    brand: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    badge: Optional[str] = Form(None),
    type: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    lifestyle: Optional[str] = Form(None),
    fuel: Optional[str] = Form(None),
    transmission: Optional[str] = Form(None),
    emi: Optional[int] = Form(None),
    seats: Optional[int] = Form(None),
    engine: Optional[str] = Form(None),
    power: Optional[str] = Form(None),
    mileage: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    features: Optional[str] = Form(None),
    colors: Optional[str] = Form(None),
    imageUrls: Optional[str] = Form(None),
    replaceImages: Optional[str] = Form(None),
    rating: Optional[float] = Form(None),
    photos: List[UploadFile] = File(default=[]),
    current_user: User = Depends(require_permission("inventory:edit")),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Check pricing permission if price is being altered
    if price is not None and float(price) != vehicle.price:
        user_permissions = current_user.permissions or []
        if current_user.role != "superadmin" and "pricing:edit" not in user_permissions and "*" not in user_permissions:
            raise HTTPException(
                status_code=403,
                detail='Access denied: You do not possess the "pricing:edit" permission to modify vehicle prices. Contact Super Admin.'
            )
        vehicle.price = float(price)

    if brand is not None:
        vehicle.brand = brand.strip()
    if model is not None:
        vehicle.model = model.strip()
    if badge is not None:
        vehicle.badge = badge.strip()
    if type is not None:
        vehicle.type = type.strip()
    if category is not None:
        vehicle.category = category
    elif price is not None:
        vehicle.category = "premium" if vehicle.price > 25 else "non-premium"

    if lifestyle is not None:
        vehicle.lifestyle = lifestyle
    if fuel is not None:
        vehicle.fuel = fuel
    if transmission is not None:
        vehicle.transmission = transmission
    if emi is not None:
        vehicle.emi = int(emi)
    if seats is not None:
        vehicle.seats = int(seats)
    if engine is not None:
        vehicle.engine = engine.strip()
    if power is not None:
        vehicle.power = power.strip()
    if mileage is not None:
        vehicle.mileage = mileage.strip()
    if description is not None:
        vehicle.description = description.strip()
    if rating is not None:
        vehicle.rating = float(rating)

    # Manage images
    current_images = list(vehicle.images or [])
    if replaceImages == "true":
        current_images = []

    if photos:
        for file in photos:
            if file.filename:
                current_images.append(save_uploaded_file(file))

    if imageUrls:
        try:
            extra = json.loads(imageUrls)
            if isinstance(extra, list):
                current_images.extend(extra)
        except Exception:
            current_images.extend([s.strip() for s in imageUrls.split(",") if s.strip()])

    vehicle.images = current_images

    # Features
    if features is not None:
        try:
            vehicle.features = json.loads(features)
        except Exception:
            vehicle.features = [s.strip() for s in features.split("\n") if s.strip()]

    # Colors
    if colors is not None:
        try:
            vehicle.colors = json.loads(colors)
        except Exception:
            pass

    vehicle.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(vehicle)

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="VEHICLE_UPDATED",
        target=f"{vehicle.brand} {vehicle.model} ({vehicle.id})",
        details=f"Updated vehicle specs/price. Price: ₹{vehicle.price} Lakhs.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": "Vehicle updated successfully",
        "vehicle": vehicle.to_dict()
    }


# ==========================================
# Delete Vehicle (Requires inventory:delete)
# ==========================================

@router.delete("/vehicles/{vehicle_id}")
def delete_vehicle(
    vehicle_id: str,
    request: Request,
    current_user: User = Depends(require_permission("inventory:delete")),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()

    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    brand_name = vehicle.brand
    model_name = vehicle.model

    # Cleanup local image files if any
    for img_path in (vehicle.images or []):
        if isinstance(img_path, str) and img_path.startswith("/uploads/"):
            filename = os.path.basename(img_path)
            disk_file = settings.UPLOADS_DIR / filename
            if disk_file.exists():
                try:
                    disk_file.unlink()
                except Exception as e:
                    print(f"Could not delete image file {disk_file}: {e}")

    db.delete(vehicle)
    db.commit()

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="VEHICLE_DELETED",
        target=f"{brand_name} {model_name} ({vehicle_id})",
        details="Vehicle permanently removed from showroom inventory.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": f"{brand_name} {model_name} deleted successfully",
        "deletedId": vehicle_id
    }
