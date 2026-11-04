import re
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator

PHONE_RE = re.compile(r"^(?:\+?91[\s-]?)?[6-9]\d{9}$")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,24}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _clean(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    return CONTROL_RE.sub("", str(v)).strip()


def normalise_phone(v: str) -> str:
    raw = re.sub(r"[\s()-]", "", _clean(v) or "")
    if not PHONE_RE.match(raw):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return "+91" + raw[-10:]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


# ==========================================
# Auth
# ==========================================


class LoginRequest(StrictModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class ChangeOwnPasswordRequest(StrictModel):
    currentPassword: Optional[str] = Field(None, max_length=200)
    newPassword: str = Field(..., max_length=200)


class UpdateOwnProfileRequest(StrictModel):
    name: Optional[str] = Field(None, max_length=200)
    username: str = Field(..., max_length=100)
    currentPassword: str = Field(..., max_length=200)


class CreateAdminRequest(StrictModel):
    username: str = Field(..., max_length=100)
    name: Optional[str] = Field("Staff Admin", max_length=200)
    temporaryPassword: str = Field(..., max_length=200)
    permissions: Optional[List[str]] = None
    rolePreset: Optional[str] = Field(None, max_length=50)


class UpdateAdminRequest(StrictModel):
    username: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=200)
    permissions: Optional[List[str]] = None
    rolePreset: Optional[str] = Field(None, max_length=50)


class ResetAdminPasswordRequest(StrictModel):
    temporaryPassword: str = Field(..., max_length=200)


class ToggleAdminStatusRequest(StrictModel):
    status: str


# ==========================================
# Public lead forms
# ==========================================


class _PublicForm(StrictModel):
    # Honeypot: real users never see or fill this field.
    website: Optional[str] = Field(None, max_length=200)


class FinanceApplicationCreate(_PublicForm):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., max_length=20)
    whatsappUpdates: bool = False
    model: str = Field(..., min_length=1, max_length=200)

    _n = field_validator("name", "model")(lambda cls, v: _clean(v))
    _p = field_validator("phone")(lambda cls, v: normalise_phone(v))


class TestDriveBookingCreate(_PublicForm):
    __test__ = False
    modelId: str = Field(..., min_length=1, max_length=128)
    modelName: str = Field(..., min_length=1, max_length=200)
    date: str = Field(..., max_length=10)
    time: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., max_length=20)
    email: str = Field(..., max_length=200)
    hasLicense: bool = True

    _c = field_validator("modelId", "modelName", "time", "name")(lambda cls, v: _clean(v))
    _p = field_validator("phone")(lambda cls, v: normalise_phone(v))

    @field_validator("date")
    @classmethod
    def _date(cls, v):
        if not DATE_RE.match(v or ""):
            raise ValueError("Date must be YYYY-MM-DD")
        return v

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        v = _clean(v)
        if not EMAIL_RE.match(v or ""):
            raise ValueError("Enter a valid email address")
        return v.lower()


class ServiceBookingCreate(_PublicForm):
    vehicleModel: str = Field(..., min_length=1, max_length=200)
    serviceType: str = Field(..., min_length=1, max_length=100)
    preferredDate: str = Field(..., max_length=10)
    customerName: str = Field(..., min_length=2, max_length=120)
    customerPhone: str = Field(..., max_length=20)
    notes: Optional[str] = Field("", max_length=2000)

    _c = field_validator("vehicleModel", "serviceType", "customerName", "notes")(lambda cls, v: _clean(v))
    _p = field_validator("customerPhone")(lambda cls, v: normalise_phone(v))

    @field_validator("preferredDate")
    @classmethod
    def _date(cls, v):
        if not DATE_RE.match(v or ""):
            raise ValueError("Date must be YYYY-MM-DD")
        return v


class EnquiryCreate(_PublicForm):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., max_length=20)
    email: Optional[str] = Field(None, max_length=200)
    vehicleInterest: Optional[str] = Field(None, max_length=200)
    message: Optional[str] = Field(None, max_length=2000)
    source: Optional[str] = Field("website", max_length=50)

    _c = field_validator("name", "vehicleInterest", "message", "source")(lambda cls, v: _clean(v))
    _p = field_validator("phone")(lambda cls, v: normalise_phone(v))

    @field_validator("email")
    @classmethod
    def _email(cls, v):
        v = _clean(v)
        if not v:
            return None
        if not EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v.lower()


class ReviewSubmission(_PublicForm):
    customerName: str = Field(..., min_length=2, max_length=120)
    customerTitle: Optional[str] = Field(None, max_length=160)
    rating: Optional[int] = Field(None, ge=1, le=5)
    body: str = Field(..., min_length=20, max_length=2000)
    vehicleId: Optional[str] = Field(None, max_length=128)

    _c = field_validator("customerName", "customerTitle", "body")(lambda cls, v: _clean(v))


class LeadStatusUpdate(StrictModel):
    status: str = Field(..., max_length=30)
