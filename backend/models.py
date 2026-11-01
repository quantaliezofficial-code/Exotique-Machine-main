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
    func
)
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False, default="Admin")
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="admin")  # "superadmin" or "admin"
    permissions = Column(JSON, nullable=False, default=list)
    status = Column(String(50), nullable=False, default="active")  # "active" or "deactivated"
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "name": self.name,
            "role": self.role,
            "permissions": self.permissions or [],
            "status": self.status,
            "mustChangePassword": bool(self.must_change_password),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "lastLogin": self.last_login.isoformat() if self.last_login else None
        }


class Vehicle(Base):
    __tablename__ = "vehicles"

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
    rating = Column(Float, default=5.0)
    is_recent = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
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
            "rating": self.rating,
            "isRecent": bool(self.is_recent),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None
        }


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
            "timestamp": self.timestamp.isoformat() if self.timestamp else datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "actorId": self.actor_id,
            "actorUsername": self.actor_username,
            "actorRole": self.actor_role,
            "action": self.action,
            "target": self.target,
            "details": self.details,
            "ip": self.ip
        }


class FinanceApplication(Base):
    __tablename__ = "finance_applications"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(50), nullable=False)
    whatsapp_updates = Column(Boolean, default=False)
    model = Column(String(200), nullable=False)
    status = Column(String(50), default="pending")  # "pending", "approved", "rejected"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "whatsappUpdates": self.whatsapp_updates,
            "model": self.model,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }


class TestDriveBooking(Base):
    __tablename__ = "test_drive_bookings"

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
            "createdAt": self.created_at.isoformat() if self.created_at else None
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
            "createdAt": self.created_at.isoformat() if self.created_at else None
        }
