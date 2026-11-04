"""Customer lead capture (public) and lead management (admin)."""
import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.cms.service import new_id
from backend.database import get_db
from backend.models import FinanceApplication, TestDriveBooking, ServiceBooking, Enquiry, User, LEAD_STATUSES
from backend.schemas import (
    FinanceApplicationCreate,
    TestDriveBookingCreate,
    ServiceBookingCreate,
    EnquiryCreate,
    LeadStatusUpdate,
)
from backend.security import require_permission, public_form_rate_limit, log_activity, get_client_ip

router = APIRouter(prefix="/api", tags=["Leads: bookings & applications"])

LEAD_MODELS = {
    "finance": FinanceApplication,
    "test-drives": TestDriveBooking,
    "service": ServiceBooking,
    "enquiries": Enquiry,
}


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


def _honeypot(payload) -> bool:
    """Bots fill the hidden 'website' field; accept silently and drop."""
    return bool(getattr(payload, "website", None))


def _accepted(ref: str):
    # Only a reference is returned; personal data is never echoed back.
    return {"success": True, "reference": ref}


# ---------------------------------------------------------------------------
# Public submissions
# ---------------------------------------------------------------------------


@router.post("/finance/apply", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(public_form_rate_limit("finance"))])
def apply_finance(payload: FinanceApplicationCreate, db: Session = Depends(get_db)):
    ref = new_id("fin")
    if _honeypot(payload):
        return _accepted(ref)
    db.add(FinanceApplication(id=ref, name=payload.name, phone=payload.phone, whatsapp_updates=payload.whatsappUpdates,
                              model=payload.model, status="pending", created_at=_now()))
    db.commit()
    return _accepted(ref)


@router.post("/test-drives", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(public_form_rate_limit("test-drive"))])
def book_test_drive(payload: TestDriveBookingCreate, db: Session = Depends(get_db)):
    ref = new_id("td")
    if _honeypot(payload):
        return _accepted(ref)
    try:
        when = datetime.date.fromisoformat(payload.date)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid date")
    if when < datetime.date.today() - datetime.timedelta(days=1) or when > datetime.date.today() + datetime.timedelta(days=180):
        raise HTTPException(status_code=422, detail="Choose a date within the next 6 months")
    db.add(TestDriveBooking(id=ref, model_id=payload.modelId, model_name=payload.modelName, date=payload.date,
                            time=payload.time, name=payload.name, phone=payload.phone, email=payload.email,
                            has_license=payload.hasLicense, status="scheduled", created_at=_now()))
    db.commit()
    return _accepted(ref)


@router.post("/service/book", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(public_form_rate_limit("service"))])
def book_service(payload: ServiceBookingCreate, db: Session = Depends(get_db)):
    ref = new_id("srv")
    if _honeypot(payload):
        return _accepted(ref)
    db.add(ServiceBooking(id=ref, vehicle_model=payload.vehicleModel, service_type=payload.serviceType,
                          preferred_date=payload.preferredDate, customer_name=payload.customerName,
                          customer_phone=payload.customerPhone, notes=payload.notes or "",
                          status="pending", created_at=_now()))
    db.commit()
    return _accepted(ref)


@router.post("/enquiries", status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(public_form_rate_limit("enquiry"))])
def create_enquiry(payload: EnquiryCreate, db: Session = Depends(get_db)):
    ref = new_id("enq")
    if _honeypot(payload):
        return _accepted(ref)
    db.add(Enquiry(id=ref, name=payload.name, phone=payload.phone, email=payload.email,
                   vehicle_interest=payload.vehicleInterest, message=payload.message,
                   source=(payload.source or "website")[:50], status="new", created_at=_now()))
    db.commit()
    return _accepted(ref)


# ---------------------------------------------------------------------------
# Admin (personal data: requires leads:view)
# ---------------------------------------------------------------------------


@router.get("/finance/applications")
def list_finance_applications(current_user: User = Depends(require_permission("leads:view")),
                              db: Session = Depends(get_db)):
    apps = db.query(FinanceApplication).order_by(desc(FinanceApplication.created_at)).limit(1000).all()
    return {"success": True, "count": len(apps), "applications": [a.to_dict() for a in apps]}


@router.get("/test-drives")
def list_test_drives(current_user: User = Depends(require_permission("leads:view")),
                     db: Session = Depends(get_db)):
    rows = db.query(TestDriveBooking).order_by(desc(TestDriveBooking.created_at)).limit(1000).all()
    return {"success": True, "count": len(rows), "bookings": [b.to_dict() for b in rows]}


@router.get("/service/bookings")
def list_service_bookings(current_user: User = Depends(require_permission("leads:view")),
                          db: Session = Depends(get_db)):
    rows = db.query(ServiceBooking).order_by(desc(ServiceBooking.created_at)).limit(1000).all()
    return {"success": True, "count": len(rows), "bookings": [b.to_dict() for b in rows]}


@router.get("/admin/leads")
def list_all_leads(current_user: User = Depends(require_permission("leads:view")), db: Session = Depends(get_db)):
    out = {}
    for kind, model in LEAD_MODELS.items():
        out[kind] = [r.to_dict() for r in db.query(model).order_by(desc(model.created_at)).limit(500).all()]
    return {"success": True, "leads": out, "statuses": LEAD_STATUSES}


@router.patch("/admin/leads/{kind}/{lead_id}")
def update_lead_status(kind: str, lead_id: str, payload: LeadStatusUpdate, request: Request,
                       current_user: User = Depends(require_permission("leads:manage")),
                       db: Session = Depends(get_db)):
    model = LEAD_MODELS.get(kind)
    if not model:
        raise HTTPException(status_code=404, detail="Unknown lead type")
    if payload.status not in LEAD_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {', '.join(LEAD_STATUSES)}")
    row = db.query(model).filter(model.id == lead_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Lead not found")
    old = row.status
    row.status = payload.status
    db.commit()
    log_activity(db, action="LEAD_STATUS_UPDATED", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=f"{kind}:{lead_id}", details=f"{old} -> {payload.status}",
                 ip=get_client_ip(request))
    return {"success": True, "lead": row.to_dict()}
