"""Startup data tasks: bootstrap the first super admin, remediate published default
passwords, import legacy JSON fleet data into an empty database, and create default
CMS settings. Never creates accounts with hard-coded passwords."""
import datetime
import json
import logging

from sqlalchemy.orm import Session

from backend.cms.defaults import LEGACY_OFFERS, LEGACY_HERO_SLIDES, LEGACY_REVIEWS
from backend.cms.service import ensure_default_settings, new_id, now_utc
from backend.config import settings, KNOWN_PUBLIC_SECRETS
from backend.database import SessionLocal, init_db
from backend.models import User, Vehicle, Offer, SiteSetting, HeroSlide, Review
from backend.permissions import ALL_PERMISSIONS, clean_permissions
from backend.security import hash_password, verify_password, log_activity
from backend.services.listing_facts import extract_facts

logger = logging.getLogger("luxura.seed")

DEFAULT_PASSWORDS = ("superadmin123", "admin123", "admin12345", "password", "admin")


def _bootstrap_superadmin(db: Session):
    if db.query(User).filter(User.role == "superadmin").first():
        return
    pwd = settings.SUPERADMIN_PASSWORD
    if not pwd or pwd.lower() in KNOWN_PUBLIC_SECRETS or len(pwd) < 10:
        logger.critical(
            "No Super Admin exists and SUPERADMIN_PASSWORD is missing/weak. "
            "Set SUPERADMIN_USERNAME and a strong SUPERADMIN_PASSWORD (10+ chars) and restart."
        )
        return
    db.add(User(
        id="usr_superadmin",
        username=settings.SUPERADMIN_USERNAME.strip().lower(),
        name=settings.SUPERADMIN_NAME,
        password_hash=hash_password(pwd),
        role="superadmin",
        permissions=ALL_PERMISSIONS,
        status="active",
        must_change_password=False,
        token_version=0,
        created_at=now_utc(),
    ))
    db.commit()
    logger.info("Super Admin '%s' created from environment settings.", settings.SUPERADMIN_USERNAME)


def _import_legacy_users(db: Session):
    """Import users from the old JSON store only if they have a real bcrypt hash."""
    users_file = settings.DATA_DIR / "users.json"
    if not users_file.exists():
        return
    try:
        users_data = json.loads(users_file.read_text(encoding="utf-8"))
    except Exception as e:
        logger.warning("Could not read legacy users.json: %s", e)
        return
    for u in users_data:
        username = str(u.get("username", "")).strip().lower()
        p_hash = u.get("passwordHash", "")
        if not username or len(p_hash) < 55:
            continue
        if db.query(User).filter(User.username == username).first():
            continue
        db.add(User(
            id=u.get("id") or new_id("usr"),
            username=username,
            name=u.get("name", "Admin"),
            password_hash=p_hash,
            role="superadmin" if u.get("role") == "superadmin" else "admin",
            permissions=clean_permissions(u.get("permissions", [])),
            status=u.get("status", "active"),
            must_change_password=bool(u.get("mustChangePassword", False)),
            token_version=0,
            created_at=now_utc(),
        ))
    db.commit()


def remediate_default_passwords(db: Session):
    """Accounts still using a password published in the repository are neutralised.

    Forcing a password change is not enough on its own: the forced-change screen asks for
    the current password, which is public, so anyone could complete it first. Instead:
    * a super admin is rotated to SUPERADMIN_PASSWORD (production refuses to start if that
      is missing or weak, so the owner can never be locked out silently);
    * every other account gets an unusable random password; a super admin issues a new
      one-time password from Admin → Staff.
    All sessions of affected accounts are revoked."""
    import secrets

    env_pwd = settings.SUPERADMIN_PASSWORD
    env_pwd_ok = bool(env_pwd) and env_pwd.lower() not in KNOWN_PUBLIC_SECRETS and len(env_pwd) >= 10
    for user in db.query(User).all():
        user.permissions = clean_permissions(user.permissions) if user.role != "superadmin" else ALL_PERMISSIONS
        if not any(verify_password(p, user.password_hash) for p in DEFAULT_PASSWORDS):
            continue
        user.token_version = int(user.token_version or 0) + 1
        if user.role == "superadmin" and env_pwd_ok:
            user.password_hash = hash_password(env_pwd)
            user.must_change_password = False
            action = "rotated to SUPERADMIN_PASSWORD"
        elif user.role == "superadmin" and settings.is_production:
            db.rollback()
            raise RuntimeError(
                f"Super admin '{user.username}' still uses a published default password. Set a strong "
                "SUPERADMIN_PASSWORD (10+ characters, not a known default) in .env and restart."
            )
        else:
            user.password_hash = hash_password(secrets.token_urlsafe(32))
            user.must_change_password = True
            action = "locked with a random password; a super admin must issue a new one-time password"
        logger.critical("SECURITY: account '%s' used a published default password - %s.", user.username, action)
        db.commit()
        log_activity(db, action="SECURITY_DEFAULT_PASSWORD_REMEDIATED", target=user.username,
                     details=f"Account used a publicly known default password; {action}. All sessions revoked.")
    db.commit()


def _seed_vehicles(db: Session):
    if db.query(Vehicle).count() > 0:
        return
    vehicles_file = settings.DATA_DIR / "vehicles.json"
    if not vehicles_file.exists():
        return
    vehicles_data = json.loads(vehicles_file.read_text(encoding="utf-8"))
    for v in vehicles_data:
        c_at = now_utc()
        if v.get("createdAt"):
            try:
                c_at = datetime.datetime.fromisoformat(v["createdAt"].replace("Z", "+00:00"))
            except Exception:
                pass
        facts = extract_facts(v)
        db.add(Vehicle(
            id=v["id"],
            brand=v.get("brand", "").strip(),
            model=v.get("model", "").strip(),
            badge=v.get("badge", f"{v.get('model')} Edition"),
            type=v.get("type", "Pre-Owned SUV"),
            category=v.get("category", "non-premium"),
            lifestyle=v.get("lifestyle", "SUV"),
            fuel=v.get("fuel", "Petrol"),
            transmission=v.get("transmission", "Automatic"),
            price=float(v.get("price", 0.0)),
            emi=int(v.get("emi", 0)),
            seats=int(v.get("seats", 5)),
            engine=v.get("engine", ""),
            power=v.get("power", ""),
            mileage=v.get("mileage", ""),
            images=v.get("images", []),
            colors=v.get("colors", []),
            description=v.get("description", ""),
            features=v.get("features", []),
            rating=float(v.get("rating", 5.0)),
            is_recent=bool(v.get("isRecent", True)),
            year=facts["year"], km_driven=facts["km_driven"], owners=facts["owners"],
            registration=facts["registration"], condition="used", status="available", is_published=True,
            created_at=c_at,
        ))
    db.commit()
    logger.info("Seeded %d vehicles from legacy JSON.", len(vehicles_data))


def _seed_legacy_content(db: Session):
    """One-off import of content that was hard-coded in the previous frontend. Each part
    runs once (flag in system.seeded), so deleting the imported items later is final."""
    flag = db.query(SiteSetting).filter(SiteSetting.key == "system.seeded").first()
    done = dict((flag.published_value or {}) if flag else {})
    start = now_utc()
    if not done.get("legacy_offers"):
        if db.query(Offer).count() == 0:
            for i, o in enumerate(LEGACY_OFFERS):
                db.add(Offer(id=new_id("ofr"), sort_order=i, status="draft", show_on_home=True,
                             starts_at=start, ends_at=start + datetime.timedelta(days=30),
                             author_id="system", author_name="Imported from previous site", **o))
        done["legacy_offers"] = True
    if not done.get("legacy_hero"):
        if db.query(HeroSlide).count() == 0:
            existing = {v for (v,) in db.query(Vehicle.id).all()}
            for i, h in enumerate(LEGACY_HERO_SLIDES):
                vid = h["vehicle_id"] if h["vehicle_id"] in existing else None
                data = {k: v for k, v in h.items() if k != "vehicle_id"}
                db.add(HeroSlide(id=new_id("hero"), sort_order=i, status="published", vehicle_id=vid,
                                 cta_url=f"/cars/{h['vehicle_id']}" if vid else "/cars",
                                 updated_by="Imported from previous site", **data))
        done["legacy_hero"] = True
    if not done.get("legacy_reviews"):
        for i, r in enumerate(LEGACY_REVIEWS):
            if not db.query(Review).filter(Review.customer_name == r["customer_name"], Review.body == r["body"]).first():
                db.add(Review(id=new_id("rev"), sort_order=i, status="pending", source="previous-site",
                              review_date=start, moderated_by="Imported from previous site", **r))
        done["legacy_reviews"] = True
    if flag:
        flag.published_value = done
    else:
        db.add(SiteSetting(key="system.seeded", published_value=done, draft_value=done, updated_by="system"))
    db.commit()


def seed_database(db: Session = None):
    close_db = False
    if db is None:
        init_db()
        db = SessionLocal()
        close_db = True
    try:
        _import_legacy_users(db)
        _bootstrap_superadmin(db)
        remediate_default_passwords(db)
        _seed_vehicles(db)
        ensure_default_settings(db)
        _seed_legacy_content(db)
    except Exception as e:
        db.rollback()
        logger.error("Error seeding database: %s", e, exc_info=True)
        raise
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_database()
