import json
import logging
import datetime
from pathlib import Path
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import SessionLocal, init_db
from backend.models import User, Vehicle, ActivityLog
from backend.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("luxura.seed")

def seed_database(db: Session = None):
    """
    Seed users, vehicles, and activity logs from server/data JSON files into the database.
    """
    close_db = False
    if db is None:
        init_db()
        db = SessionLocal()
        close_db = True

    try:
        # ==========================================
        # 1. Seed Users
        # ==========================================
        users_file = settings.DATA_DIR / "users.json"
        if users_file.exists():
            with open(users_file, "r", encoding="utf-8") as f:
                users_data = json.load(f)

            for u in users_data:
                existing = db.query(User).filter(User.username == u["username"].lower()).first()
                if not existing:
                    # Provide secure default passwords if JSON hash is truncated
                    p_hash = u.get("passwordHash", "")
                    if len(p_hash) < 55:
                        if u["username"].lower() == "superadmin":
                            p_hash = hash_password("superadmin123")
                        else:
                            p_hash = hash_password("admin12345")

                    user_obj = User(
                        id=u.get("id", f"usr_{u['username']}"),
                        username=u["username"].lower(),
                        name=u.get("name", "Admin"),
                        password_hash=p_hash,
                        role=u.get("role", "admin"),
                        permissions=u.get("permissions", []),
                        status=u.get("status", "active"),
                        must_change_password=bool(u.get("mustChangePassword", False)),
                        created_at=datetime.datetime.now(datetime.timezone.utc)
                    )
                    db.add(user_obj)
            db.commit()
            logger.info(" Users seeded successfully.")
        else:
            # Fallback default superadmin if no users.json
            if not db.query(User).filter(User.username == "superadmin").first():
                superadmin = User(
                    id="usr_superadmin",
                    username="superadmin",
                    name="Master Super Admin",
                    password_hash=hash_password("superadmin123"),
                    role="superadmin",
                    permissions=[
                        "inventory:view",
                        "inventory:create",
                        "inventory:edit",
                        "inventory:delete",
                        "pricing:edit",
                        "logs:view"
                    ],
                    status="active",
                    must_change_password=False,
                    created_at=datetime.datetime.now(datetime.timezone.utc)
                )
                db.add(superadmin)
                db.commit()
                logger.info(" Default Super Admin seeded successfully (Username: superadmin / Password: superadmin123).")

        # ==========================================
        # 2. Seed Vehicles
        # ==========================================
        vehicles_file = settings.DATA_DIR / "vehicles.json"
        if vehicles_file.exists():
            with open(vehicles_file, "r", encoding="utf-8") as f:
                vehicles_data = json.load(f)

            existing_count = db.query(Vehicle).count()
            if existing_count == 0:
                for v in vehicles_data:
                    # Ensure created_at / updated_at parsed
                    c_at = datetime.datetime.now(datetime.timezone.utc)
                    if v.get("createdAt"):
                        try:
                            c_at = datetime.datetime.fromisoformat(v["createdAt"].replace("Z", "+00:00"))
                        except Exception:
                            pass

                    veh_obj = Vehicle(
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
                        engine=v.get("engine", "Performance Powertrain"),
                        power=v.get("power", "Certified Performance"),
                        mileage=v.get("mileage", "Verified Showroom Mileage"),
                        images=v.get("images", []),
                        colors=v.get("colors", []),
                        description=v.get("description", ""),
                        features=v.get("features", []),
                        rating=float(v.get("rating", 5.0)),
                        is_recent=bool(v.get("isRecent", True)),
                        created_at=c_at
                    )
                    db.add(veh_obj)
                db.commit()
                logger.info(f" Seeded {len(vehicles_data)} vehicles successfully.")
            else:
                logger.info(f" Vehicles table already populated with {existing_count} records.")

        # ==========================================
        # 3. Seed Activity Logs
        # ==========================================
        logs_file = settings.DATA_DIR / "activity_logs.json"
        if logs_file.exists():
            with open(logs_file, "r", encoding="utf-8") as f:
                logs_data = json.load(f)

            existing_logs = db.query(ActivityLog).count()
            if existing_logs == 0 and isinstance(logs_data, list):
                for l in logs_data[:50]:  # Seed latest 50 logs
                    t_stamp = datetime.datetime.now(datetime.timezone.utc)
                    if l.get("timestamp"):
                        try:
                            t_stamp = datetime.datetime.fromisoformat(l["timestamp"].replace("Z", "+00:00"))
                        except Exception:
                            pass

                    log_obj = ActivityLog(
                        id=l.get("id", f"log_{datetime.datetime.now(datetime.timezone.utc).timestamp()}"),
                        timestamp=t_stamp,
                        actor_id=l.get("actorId", "system"),
                        actor_username=l.get("actorUsername", "system"),
                        actor_role=l.get("actorRole", "system"),
                        action=l.get("action", "SYSTEM_SEED"),
                        target=l.get("target", "N/A"),
                        details=l.get("details", ""),
                        ip=l.get("ip", "127.0.0.1")
                    )
                    db.add(log_obj)
                db.commit()
                logger.info(f" Seeded activity logs successfully.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    seed_database()
