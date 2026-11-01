from typing import List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict

# Base schema with camelCase aliasing capability
class CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ==========================================
# Auth Schemas
# ==========================================

class LoginRequest(BaseModel):
    username: str
    password: str


class AdminUserResponse(CamelModel):
    id: str
    username: str
    name: str
    role: str
    permissions: List[str] = Field(default_factory=list)
    status: str = "active"
    mustChangePassword: bool = Field(default=False, alias="mustChangePassword")
    createdAt: Optional[str] = Field(default=None, alias="createdAt")
    updatedAt: Optional[str] = Field(default=None, alias="updatedAt")
    lastLogin: Optional[str] = Field(default=None, alias="lastLogin")


class LoginResponse(BaseModel):
    token: str
    user: AdminUserResponse


class ChangeOwnPasswordRequest(BaseModel):
    currentPassword: Optional[str] = None
    newPassword: str


class UpdateOwnProfileRequest(BaseModel):
    name: Optional[str] = None
    username: str
    currentPassword: str


class CreateAdminRequest(BaseModel):
    username: str
    name: Optional[str] = "Staff Admin"
    temporaryPassword: str
    permissions: Optional[List[str]] = None


class UpdateAdminRequest(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    permissions: Optional[List[str]] = None


class ResetAdminPasswordRequest(BaseModel):
    temporaryPassword: str


class ToggleAdminStatusRequest(BaseModel):
    status: str  # "active" or "deactivated"


# ==========================================
# Activity Log Schemas
# ==========================================

class ActivityLogResponse(CamelModel):
    id: str
    timestamp: str
    actorId: str = Field(..., alias="actorId")
    actorUsername: str = Field(..., alias="actorUsername")
    actorRole: str = Field(..., alias="actorRole")
    action: str
    target: Optional[str] = "N/A"
    details: Optional[str] = ""
    ip: Optional[str] = "127.0.0.1"


# ==========================================
# Vehicle Schemas
# ==========================================

class ColorOption(BaseModel):
    name: str
    hex: str


class VehicleResponse(CamelModel):
    id: str
    brand: str
    model: str
    badge: str
    type: str
    category: str = "non-premium"
    lifestyle: str = "SUV"
    fuel: str = "Petrol"
    transmission: str = "Automatic"
    price: float
    emi: int
    seats: int = 5
    engine: str
    power: str
    mileage: str
    images: List[str] = Field(default_factory=list)
    colors: List[ColorOption] = Field(default_factory=list)
    description: str
    features: List[str] = Field(default_factory=list)
    rating: float = 5.0
    isRecent: bool = Field(default=True, alias="isRecent")
    createdAt: Optional[str] = Field(default=None, alias="createdAt")
    updatedAt: Optional[str] = Field(default=None, alias="updatedAt")


class VehicleListResponse(BaseModel):
    success: bool = True
    count: int
    vehicles: List[VehicleResponse]


# ==========================================
# Booking / Application Schemas
# ==========================================

class FinanceApplicationCreate(BaseModel):
    name: str
    phone: str
    whatsappUpdates: bool = False
    model: str


class FinanceApplicationResponse(CamelModel):
    id: str
    name: str
    phone: str
    whatsappUpdates: bool
    model: str
    status: str
    createdAt: Optional[str] = None


class TestDriveBookingCreate(BaseModel):
    modelId: str
    modelName: str
    date: str
    time: str
    name: str
    phone: str
    email: str
    hasLicense: bool = True


class TestDriveBookingResponse(CamelModel):
    id: str
    modelId: str
    modelName: str
    date: str
    time: str
    name: str
    phone: str
    email: str
    hasLicense: bool
    status: str
    createdAt: Optional[str] = None


class ServiceBookingCreate(BaseModel):
    vehicleModel: str
    serviceType: str
    preferredDate: str
    customerName: str
    customerPhone: str
    notes: Optional[str] = ""


class ServiceBookingResponse(CamelModel):
    id: str
    vehicleModel: str
    serviceType: str
    preferredDate: str
    customerName: str
    customerPhone: str
    notes: Optional[str] = ""
    status: str
    createdAt: Optional[str] = None
