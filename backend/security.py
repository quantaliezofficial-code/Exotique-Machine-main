import time
import uuid
import datetime
from typing import Optional, Dict, List
import bcrypt
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.config import settings
from backend.database import get_db
from backend.models import User, ActivityLog

security_bearer = HTTPBearer(auto_error=False)

# ==========================================
# Password Hashing
# ==========================================

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    salt = bcrypt.gensalt(12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash safely."""
    try:
        if not hashed_password or len(hashed_password) < 20:
            return False
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ==========================================
# JWT Tokens
# ==========================================

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generate signed JWT token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
    else:
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=settings.JWT_EXPIRES_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired session token"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired session token"
        )


# ==========================================
# Brute Force & Rate Limiting
# ==========================================

login_attempts: Dict[str, dict] = {}

def check_brute_force(identifier: str) -> dict:
    """Check if identifier is temporarily locked out."""
    now = time.time()
    record = login_attempts.get(identifier)
    if not record:
        return {"is_locked": False}

    lock_until = record.get("lock_until")
    if lock_until and now < lock_until:
        minutes_left = int((lock_until - now) / 60) + 1
        return {
            "is_locked": True,
            "message": f"Account temporarily locked due to consecutive failed attempts. Try again in {minutes_left} minute(s)."
        }

    # Reset expired lockout
    if lock_until and now >= lock_until:
        login_attempts.pop(identifier, None)
        return {"is_locked": False}

    return {"is_locked": False}


def record_failed_attempt(identifier: str):
    """Record a failed login attempt."""
    now = time.time()
    record = login_attempts.get(identifier, {"count": 0, "first_attempt": now})
    record["count"] += 1

    if record["count"] >= settings.MAX_LOGIN_ATTEMPTS:
        record["lock_until"] = now + settings.LOCKOUT_TIME_SECONDS

    login_attempts[identifier] = record


def clear_failed_attempts(identifier: str):
    """Clear failed login attempts upon successful login."""
    login_attempts.pop(identifier, None)


# ==========================================
# Activity Logging Helper
# ==========================================

def log_activity(
    db: Session,
    action: str,
    actor_id: str = "system",
    actor_username: str = "system",
    actor_role: str = "system",
    target: str = "N/A",
    details: str = "",
    ip: str = "127.0.0.1"
):
    """Write an audit activity log entry to the database."""
    try:
        new_log = ActivityLog(
            id=f"log_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            actor_id=actor_id or "system",
            actor_username=actor_username or "system",
            actor_role=actor_role or "system",
            action=action,
            target=target or "N/A",
            details=details or "",
            ip=ip or "127.0.0.1"
        )
        db.add(new_log)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Failed to write activity log: {e}")


# ==========================================
# RBAC & Authentication Dependencies
# ==========================================

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Validate bearer token and fetch live user profile from database."""
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token required"
        )

    payload = decode_access_token(auth.credentials)
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists"
        )

    if user.status == "deactivated":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated by Super Admin."
        )

    return user


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    """Super Admin Only dependency."""
    if current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Super Admin authority required."
        )
    return current_user


def require_permission(permission: str):
    """Granular RBAC permission check."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role == "superadmin":
            return current_user

        user_permissions = current_user.permissions or []
        if permission in user_permissions or "*" in user_permissions:
            return current_user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Missing required permission [{permission}]. Contact Super Admin for access."
        )

    return permission_checker
