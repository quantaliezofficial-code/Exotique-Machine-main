import datetime
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Text,
    DateTime,
    JSON,
    ForeignKey,
    Index,
    func,
)
from backend.database import Base


def _iso(dt):
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    return dt.isoformat()


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False, default="Admin")
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="admin")  # "superadmin" or "admin"
    role_preset = Column(String(50), nullable=True)  # display label: content_manager, editor, ...
    permissions = Column(JSON, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="active")
    must_change_password = Column(Boolean, default=False)
    token_version = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "role": self.role,
            "rolePreset": self.role_preset,
            "permissions": self.permissions or [],
            "status": self.status,
            "mustChangePassword": bool(self.must_change_password),
            "createdAt": _iso(self.created_at),
            "updatedAt": _iso(self.updated_at),
            "lastLogin": _iso(self.last_login),
        }


VEHICLE_STATUSES = ("available", "reserved", "sold")


class Vehicle(Base):
    __tablename__ = "vehicles"
    __table_args__ = (
        # Public listing query: WHERE is_published ORDER BY created_at DESC
        Index("ix_vehicles_published_created", "is_published", "created_at"),
    )

    # The id doubles as the stable public URL slug: /cars/<id>
    id = Column(String(128), primary_key=True, index=True)
    brand = Column(String(100), nullable=False, index=True)
    model = Column(String(100), nullable=False, index=True)
    badge = Column(String(100), nullable=False)
    type = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False, default="non-premium", index=True)
    lifestyle = Column(String(50), nullable=False, default="SUV")
    fuel = Column(String(50), nullable=False, default="Petrol", index=True)
    transmission = Column(String(50), nullable=False, default="Automatic")
    price = Column(Float, nullable=False)  # in Lakhs
    emi = Column(Integer, nullable=False)  # in INR
    seats = Column(Integer, nullable=False, default=5)
    engine = Column(String(200), nullable=False)
    power = Column(String(200), nullable=False)
    mileage = Column(String(200), nullable=False)
    images = Column(JSON, nullable=False, default=list)
    colors = Column(JSON, nullable=False, default=list)
    description = Column(Text, nullable=False)
    features = Column(JSON, nullable=False, default=list)
    rating = Column(Float, default=5.0)  # legacy field: not shown publicly (not a real customer rating)
    is_recent = Column(Boolean, default=True)

    # Listing facts (nullable: only filled when actually known)
    year = Column(Integer, nullable=True)
    km_driven = Column(Integer, nullable=True)
    owners = Column(Integer, nullable=True)
    registration = Column(String(40), nullable=True)
    condition = Column(String(20), nullable=False, default="used")  # used | new
    status = Column(String(20), nullable=False, default="available", index=True)
    is_published = Column(Boolean, nullable=False, default=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self, public: bool = False):
        data = {
            "id": self.id,
            "slug": self.id,
            "brand": self.brand,
            "model": self.model,
            "badge": self.badge,
            "type": self.type,
            "category": self.category,
            "lifestyle": self.lifestyle,
            "fuel": self.fuel,
            "transmission": self.transmission,
            "price": self.price,
            "emi": self.emi,
            "seats": self.seats,
            "engine": self.engine,
            "power": self.power,
            "mileage": self.mileage,
            "images": self.images or [],
            "colors": self.colors or [],
            "description": self.description,
            "features": self.features or [],
            "isRecent": bool(self.is_recent),
            "year": self.year,
            "kmDriven": self.km_driven,
            "owners": self.owners,
            "registration": self.registration,
            "condition": self.condition or "used",
            "status": self.status or "available",
            "isPublished": bool(self.is_published),
            "createdAt": _iso(self.created_at),
            "updatedAt": _iso(self.updated_at),
        }
        if not public:
            data["rating"] = self.rating
        return data


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(64), primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    actor_id = Column(String(64), nullable=False)
    actor_username = Column(String(100), nullable=False, index=True)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    target = Column(String(255), default="N/A")
    details = Column(Text, default="")
    ip = Column(String(64), default="127.0.0.1")

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": _iso(self.timestamp) or datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "actorId": self.actor_id,
            "actorUsername": self.actor_username,
            "actorRole": self.actor_role,
            "action": self.action,
            "target": self.target,
            "details": self.details,
            "ip": self.ip,
        }


LEAD_STATUSES = ("new", "pending", "contacted", "scheduled", "approved", "rejected", "closed", "cancelled")


class FinanceApplication(Base):
    __tablename__ = "finance_applications"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    whatsapp_updates = Column(Boolean, default=False)
    model = Column(String(200), nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "whatsappUpdates": self.whatsapp_updates,
            "model": self.model,
            "status": self.status,
            "createdAt": _iso(self.created_at),
        }


class TestDriveBooking(Base):
    __tablename__ = "test_drive_bookings"
    __test__ = False  # not a pytest test class

    id = Column(String(64), primary_key=True, index=True)
    model_id = Column(String(128), nullable=False)
    model_name = Column(String(200), nullable=False)
    date = Column(String(50), nullable=False)
    time = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(200), nullable=False)
    has_license = Column(Boolean, default=True)
    status = Column(String(50), default="scheduled")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "modelId": self.model_id,
            "modelName": self.model_name,
            "date": self.date,
            "time": self.time,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "hasLicense": self.has_license,
            "status": self.status,
            "createdAt": _iso(self.created_at),
        }


class ServiceBooking(Base):
    __tablename__ = "service_bookings"

    id = Column(String(64), primary_key=True, index=True)
    vehicle_model = Column(String(200), nullable=False)
    service_type = Column(String(100), nullable=False)
    preferred_date = Column(String(50), nullable=False)
    customer_name = Column(String(200), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    notes = Column(Text, default="")
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleModel": self.vehicle_model,
            "serviceType": self.service_type,
            "preferredDate": self.preferred_date,
            "customerName": self.customer_name,
            "customerPhone": self.customer_phone,
            "notes": self.notes,
            "status": self.status,
            "createdAt": _iso(self.created_at),
        }


class Enquiry(Base):
    """General showroom enquiry (previously only sent to WhatsApp and never stored)."""

    __tablename__ = "enquiries"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(200), nullable=True)
    vehicle_interest = Column(String(200), nullable=True)
    message = Column(Text, nullable=True)
    source = Column(String(50), nullable=False, default="website")
    status = Column(String(50), nullable=False, default="new")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "vehicleInterest": self.vehicle_interest,
            "message": self.message,
            "source": self.source,
            "status": self.status,
            "createdAt": _iso(self.created_at),
        }


# ==========================================================================
# CMS
# ==========================================================================

CONTENT_STATUSES = ("draft", "published", "archived")
OFFER_STATUSES = ("draft", "published", "paused", "archived")
REVIEW_STATUSES = ("pending", "approved", "rejected")


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id = Column(String(64), primary_key=True)
    url = Column(String(500), nullable=False, unique=True, index=True)  # /uploads/<file>
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=True)
    mime_type = Column(String(50), nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    sha256 = Column(String(64), nullable=True, index=True)
    alt = Column(String(300), nullable=True)
    folder = Column(String(50), nullable=False, default="general")  # hero, offers, reviews, vehicles, general
    uploaded_by = Column(String(64), nullable=True)
    # Preservation: the untouched uploaded file (private, never served)
    original_path = Column(String(500), nullable=True)
    original_bytes = Column(Integer, nullable=True)
    # Tiny blurred preview (data URI, ~300-600 bytes) shown while the real image loads
    placeholder = Column(Text, nullable=True)
    variants_ready = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "url": self.url,
            "filename": self.filename,
            "originalName": self.original_name,
            "mimeType": self.mime_type,
            "width": self.width,
            "height": self.height,
            "sizeBytes": self.size_bytes,
            "originalBytes": self.original_bytes,
            "originalPreserved": bool(self.original_path),
            "variantsReady": bool(self.variants_ready),
            "placeholder": self.placeholder,
            "alt": self.alt,
            "folder": self.folder,
            "uploadedBy": self.uploaded_by,
            "createdAt": _iso(self.created_at),
        }


class HeroSlide(Base):
    __tablename__ = "hero_slides"

    id = Column(String(64), primary_key=True)
    title = Column(String(200), nullable=False)
    eyebrow = Column(String(120), nullable=True)  # small label above the title
    description = Column(Text, nullable=True)
    watermark = Column(String(60), nullable=True)
    cta_label = Column(String(80), nullable=True)
    cta_url = Column(String(300), nullable=True)
    desktop_image = Column(String(500), nullable=False)
    mobile_image = Column(String(500), nullable=True)
    image_alt = Column(String(300), nullable=True)
    vehicle_id = Column(String(128), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="draft", index=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    updated_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self, public: bool = False):
        data = {
            "id": self.id,
            "title": self.title,
            "eyebrow": self.eyebrow,
            "description": self.description,
            "watermark": self.watermark,
            "ctaLabel": self.cta_label,
            "ctaUrl": self.cta_url,
            "desktopImage": self.desktop_image,
            "mobileImage": self.mobile_image,
            "imageAlt": self.image_alt,
            "vehicleId": self.vehicle_id,
            "sortOrder": self.sort_order,
            "status": self.status,
            "startsAt": _iso(self.starts_at),
            "endsAt": _iso(self.ends_at),
        }
        if not public:
            data.update({"updatedBy": self.updated_by, "createdAt": _iso(self.created_at),
                         "updatedAt": _iso(self.updated_at)})
        return data


class FeaturedVehicle(Base):
    __tablename__ = "featured_vehicles"

    id = Column(String(64), primary_key=True)
    vehicle_id = Column(String(128), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, unique=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_visible = Column(Boolean, nullable=False, default=True)
    label = Column(String(80), nullable=True)
    card_image = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "sortOrder": self.sort_order,
            "isVisible": bool(self.is_visible),
            "label": self.label,
            "cardImage": self.card_image,
            "createdAt": _iso(self.created_at),
            "updatedAt": _iso(self.updated_at),
        }


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String(64), primary_key=True)
    customer_name = Column(String(120), nullable=False)
    customer_title = Column(String(160), nullable=True)  # e.g. "BMW X5 owner, Lucknow"
    rating = Column(Integer, nullable=True)  # 1..5, optional
    body = Column(Text, nullable=False)
    photo = Column(String(500), nullable=True)
    vehicle_id = Column(String(128), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    source = Column(String(60), nullable=False, default="website")  # website, google, in-store, ...
    source_url = Column(String(500), nullable=True)
    review_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    is_featured = Column(Boolean, nullable=False, default=False)
    sort_order = Column(Integer, nullable=False, default=0)
    submitted_ip = Column(String(64), nullable=True)
    moderated_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self, public: bool = False):
        data = {
            "id": self.id,
            "customerName": self.customer_name,
            "customerTitle": self.customer_title,
            "rating": self.rating,
            "body": self.body,
            "photo": self.photo,
            "vehicleId": self.vehicle_id,
            "source": self.source,
            "sourceUrl": self.source_url,
            "reviewDate": _iso(self.review_date),
            "isFeatured": bool(self.is_featured),
            "sortOrder": self.sort_order,
        }
        if not public:
            data.update({
                "status": self.status,
                "moderatedBy": self.moderated_by,
                "createdAt": _iso(self.created_at),
                "updatedAt": _iso(self.updated_at),
            })
        return data


class Offer(Base):
    __tablename__ = "offers"

    id = Column(String(64), primary_key=True)
    slug = Column(String(160), nullable=False, unique=True, index=True)
    title = Column(String(200), nullable=False)
    summary = Column(String(300), nullable=True)
    description = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    vehicle_id = Column(String(128), ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True)
    discount_type = Column(String(20), nullable=False, default="none")  # none | fixed | percentage
    discount_value = Column(Float, nullable=True)  # INR for fixed, % for percentage
    image = Column(String(500), nullable=True)
    cta_label = Column(String(80), nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=False)
    ends_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), nullable=False, default="draft", index=True)
    show_on_home = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    author_id = Column(String(64), nullable=True)
    author_name = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self, public: bool = False, effective_status: str = None):
        data = {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "summary": self.summary,
            "description": self.description,
            "terms": self.terms,
            "vehicleId": self.vehicle_id,
            "discountType": self.discount_type,
            "discountValue": self.discount_value,
            "image": self.image,
            "ctaLabel": self.cta_label,
            "startsAt": _iso(self.starts_at),
            "endsAt": _iso(self.ends_at),
            "showOnHome": bool(self.show_on_home),
            "sortOrder": self.sort_order,
            "effectiveStatus": effective_status,
        }
        if not public:
            data.update({
                "status": self.status,
                "authorId": self.author_id,
                "authorName": self.author_name,
                "createdAt": _iso(self.created_at),
                "updatedAt": _iso(self.updated_at),
            })
        return data


class SiteSetting(Base):
    """Key/value website settings with a draft and a published copy."""

    __tablename__ = "site_settings"

    key = Column(String(60), primary_key=True)
    draft_value = Column(JSON, nullable=True)
    published_value = Column(JSON, nullable=True)
    updated_by = Column(String(100), nullable=True)
    published_by = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)


class ContentAuditLog(Base):
    __tablename__ = "content_audit_logs"

    id = Column(String(64), primary_key=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    actor_id = Column(String(64), nullable=False)
    actor_username = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(160), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    before = Column(JSON, nullable=True)
    after = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": _iso(self.timestamp),
            "actorId": self.actor_id,
            "actorUsername": self.actor_username,
            "entityType": self.entity_type,
            "entityId": self.entity_id,
            "action": self.action,
            "before": self.before,
            "after": self.after,
        }
