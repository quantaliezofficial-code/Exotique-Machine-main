import time
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db
from backend.models import FinanceApplication, TestDriveBooking, ServiceBooking, User
from backend.schemas import (
    FinanceApplicationCreate,
    FinanceApplicationResponse,
    TestDriveBookingCreate,
    TestDriveBookingResponse,
    ServiceBookingCreate,
    ServiceBookingResponse
)
from backend.security import get_current_user, require_permission

router = APIRouter(prefix="/api", tags=["Bookings & Applications"])

# ==========================================
# Finance Applications
# ==========================================

@router.post("/finance/apply", status_code=status.HTTP_201_CREATED)
def apply_finance(payload: FinanceApplicationCreate, db: Session = Depends(get_db)):
    app_id = f"fin_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"
    application = FinanceApplication(
        id=app_id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        whatsapp_updates=payload.whatsappUpdates,
        model=payload.model.strip(),
        status="pending",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return {"success": True, "application": application.to_dict()}


@router.get("/finance/applications")
def list_finance_applications(
    current_user: User = Depends(require_permission("inventory:view")),
    db: Session = Depends(get_db)
):
    apps = db.query(FinanceApplication).order_by(desc(FinanceApplication.created_at)).all()
    return {"success": True, "count": len(apps), "applications": [a.to_dict() for a in apps]}


# ==========================================
# Test Drive Bookings
# ==========================================

@router.post("/test-drives", status_code=status.HTTP_201_CREATED)
def book_test_drive(payload: TestDriveBookingCreate, db: Session = Depends(get_db)):
    booking_id = f"td_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"
    booking = TestDriveBooking(
        id=booking_id,
        model_id=payload.modelId,
        model_name=payload.modelName.strip(),
        date=payload.date.strip(),
        time=payload.time.strip(),
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        email=payload.email.strip(),
        has_license=payload.hasLicense,
        status="scheduled",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return {"success": True, "booking": booking.to_dict()}


@router.get("/test-drives")
def list_test_drives(
    current_user: User = Depends(require_permission("inventory:view")),
    db: Session = Depends(get_db)
):
    bookings = db.query(TestDriveBooking).order_by(desc(TestDriveBooking.created_at)).all()
    return {"success": True, "count": len(bookings), "bookings": [b.to_dict() for b in bookings]}


# ==========================================
# Service Bookings
# ==========================================

@router.post("/service/book", status_code=status.HTTP_201_CREATED)
def book_service(payload: ServiceBookingCreate, db: Session = Depends(get_db)):
    booking_id = f"srv_{int(time.time() * 1000)}_{uuid.uuid4().hex[:4]}"
    booking = ServiceBooking(
        id=booking_id,
        vehicle_model=payload.vehicleModel.strip(),
        service_type=payload.serviceType.strip(),
        preferred_date=payload.preferredDate.strip(),
        customer_name=payload.customerName.strip(),
        customer_phone=payload.customerPhone.strip(),
        notes=payload.notes.strip() if payload.notes else "",
        status="pending",
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return {"success": True, "booking": booking.to_dict()}


@router.get("/service/bookings")
def list_service_bookings(
    current_user: User = Depends(require_permission("inventory:view")),
    db: Session = Depends(get_db)
):
    bookings = db.query(ServiceBooking).order_by(desc(ServiceBooking.created_at)).all()
    return {"success": True, "count": len(bookings), "bookings": [b.to_dict() for b in bookings]}
