import time
import uuid
import datetime
import ipaddress
import logging
import threading
from collections import deque
from typing import Optional, Dict, Deque, Tuple

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User, ActivityLog
from backend.permissions import has_permission

logger = logging.getLogger("luxura.security")
security_bearer = HTTPBearer(auto_error=False)

MAX_PASSWORD_BYTES = 72  # bcrypt limit
MIN_PASSWORD_LENGTH = 10

# ==========================================
# Password Hashing
# ==========================================


def validate_new_password(password: str) -> None:
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(status_code=400, detail="Password is too long (maximum 72 bytes).")
    classes = sum([any(c.islower() for c in password), any(c.isupper() for c in password),
                   any(c.isdigit() for c in password), any(not c.isalnum() for c in password)])
    if classes < 3:
        raise HTTPException(status_code=400, detail="Password must mix at least three of: lowercase, uppercase, digits, symbols.")
    from backend.config import KNOWN_PUBLIC_SECRETS
    if password.lower() in KNOWN_PUBLIC_SECRETS:
        raise HTTPException(status_code=400, detail="This password is publicly known and cannot be used.")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:MAX_PASSWORD_BYTES], bcrypt.gensalt(12)).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if not plain_password or not hashed_password or len(hashed_password) < 20:
            return False
        return bcrypt.checkpw(plain_password.encode("utf-8")[:MAX_PASSWORD_BYTES], hashed_password.encode("utf-8"))
    except Exception:
        return False


# A real hash used to equalise timing when the username does not exist.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equaliser", bcrypt.gensalt(12)).decode()


def dummy_verify() -> None:
    verify_password("not-the-password", _DUMMY_HASH)


# ==========================================
# Client IP (trust X-Forwarded-For only from private proxy hops)
# ==========================================


def _is_trusted_proxy(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return addr.is_private or addr.is_loopback


def get_client_ip(request: Request) -> str:
    peer = request.client.host if request.client else "0.0.0.0"
    if not _is_trusted_proxy(peer):
        return peer
    forwarded = request.headers.get("x-forwarded-for", "")
    hops = [h.strip() for h in forwarded.split(",") if h.strip()]
    # Walk from the nearest hop outwards and return the first address that is not one
    # of our own proxies. Anything further left is client-controlled and ignored.
    for hop in reversed(hops):
        if not _is_trusted_proxy(hop):
            return hop
    real_ip = request.headers.get("x-real-ip")
    if real_ip and not _is_trusted_proxy(real_ip):
        return real_ip
    return hops[0] if hops else peer


# ==========================================
# Rate limiting (in-process; the backend runs a single worker)
# ==========================================


class RateLimiter:
    def __init__(self):
        self._hits: Dict[Tuple[str, str], Deque[float]] = {}
        self._lock = threading.Lock()

    def hit(self, bucket: str, key: str, limit: int, window_seconds: int) -> bool:
        """Record a hit; return False when the limit is exceeded."""
        now = time.monotonic()
        with self._lock:
            q = self._hits.setdefault((bucket, key), deque())
            while q and now - q[0] > window_seconds:
                q.popleft()
            if len(q) >= limit:
                return False
            q.append(now)
            if len(self._hits) > 50_000:  # bound memory
                self._hits.clear()
            return True

    def reset(self):
        with self._lock:
            self._hits.clear()


rate_limiter = RateLimiter()


def enforce_rate_limit(request: Request, bucket: str, limit: int, window_seconds: int):
    if not rate_limiter.hit(bucket, get_client_ip(request), limit, window_seconds):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a few minutes and try again.")


def public_form_rate_limit(bucket: str):
    def dep(request: Request):
        enforce_rate_limit(request, bucket, settings.PUBLIC_FORM_LIMIT_PER_10_MIN, 600)
    return dep


# ==========================================
# Brute force protection per username
# ==========================================

login_attempts: Dict[str, dict] = {}


def check_brute_force(identifier: str) -> dict:
    now = time.time()
    record = login_attempts.get(identifier)
    if not record:
        return {"is_locked": False}
    lock_until = record.get("lock_until")
    if lock_until and now < lock_until:
        minutes_left = int((lock_until - now) / 60) + 1
        return {"is_locked": True,
                "message": f"Too many failed attempts. Try again in {minutes_left} minute(s)."}
    if lock_until and now >= lock_until:
        login_attempts.pop(identifier, None)
    return {"is_locked": False}


def record_failed_attempt(identifier: str):
    now = time.time()
    record = login_attempts.get(identifier, {"count": 0, "first_attempt": now})
    record["count"] += 1
    if record["count"] >= settings.MAX_LOGIN_ATTEMPTS:
        record["lock_until"] = now + settings.LOCKOUT_TIME_SECONDS
    login_attempts[identifier] = record
    if len(login_attempts) > 10_000:
        login_attempts.clear()


def clear_failed_attempts(identifier: str):
    login_attempts.pop(identifier, None)


# ==========================================
# JWT session tokens
# ==========================================


def create_access_token(user: User) -> str:
    now = datetime.datetime.now(datetime.timezone.utc)
    payload = {
        "sub": user.id,
        "tv": int(user.token_version or 0),
        "iat": now,
        "exp": now + datetime.timedelta(hours=settings.JWT_EXPIRES_HOURS),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM],
                          options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please sign in again.")


def set_session_cookie(response, token: str):
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=settings.JWT_EXPIRES_HOURS * 3600,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="strict",
        path="/",
    )


def clear_session_cookie(response):
    response.delete_cookie(settings.AUTH_COOKIE_NAME, path="/", samesite="strict",
                           secure=settings.COOKIE_SECURE, httponly=True)


UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def _check_csrf(request: Request):
    """Cookie sessions require a custom header on state-changing requests.

    Browsers cannot attach a custom header to a cross-site request without a CORS
    pre-flight, which our CORS policy rejects. The Origin check is defence in depth.
    """
    if request.method not in UNSAFE_METHODS:
        return
    if request.headers.get("x-requested-with", "").lower() != "xmlhttprequest":
        raise HTTPException(status_code=403, detail="Missing CSRF header.")
    origin = request.headers.get("origin")
    if origin and settings.is_production:
        from urllib.parse import urlparse
        origin = origin.rstrip("/")
        hosts = {h.strip().lower() for h in (request.headers.get("host", ""),
                                             request.headers.get("x-forwarded-host", "")) if h.strip()}
        same_host = urlparse(origin).netloc.lower() in hosts
        if not (same_host or origin == settings.SITE_URL or origin in settings.CORS_ORIGINS):
            raise HTTPException(status_code=403, detail="Cross-origin request rejected.")


def _resolve_user(request: Request, auth: Optional[HTTPAuthorizationCredentials], db: Session) -> User:
    token = None
    via_cookie = False
    if auth and auth.credentials:
        token = auth.credentials
    else:
        token = request.cookies.get(settings.AUTH_COOKIE_NAME)
        via_cookie = bool(token)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in to continue.")
    if via_cookie:
        _check_csrf(request)

    payload = decode_access_token(token)
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or int(payload.get("tv", -1)) != int(user.token_version or 0):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Your session has expired. Please sign in again.")
    if user.status == "deactivated":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been deactivated by Super Admin.")
    request.state.actor = user.username  # picked up by the request logger
    return user


def get_current_user_allow_pending(
    request: Request,
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Authenticated user, even if they still have to change a temporary password."""
    return _resolve_user(request, auth, db)


def get_current_user(user: User = Depends(get_current_user_allow_pending)) -> User:
    if user.must_change_password:
        raise HTTPException(status_code=403, detail="PASSWORD_CHANGE_REQUIRED: set a new password before continuing.")
    return user


def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    """Used by public endpoints for draft preview; never raises."""
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user or user.status == "deactivated" or user.must_change_password:
        return None
    if int(payload.get("tv", -1)) != int(user.token_version or 0):
        return None
    return user


def require_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "superadmin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: Super Admin authority required.")
    return current_user


def require_permission(permission: str):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if has_permission(current_user, permission):
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: missing permission [{permission}]. Contact Super Admin for access.",
        )
    return permission_checker


def require_any_permission(*permissions: str):
    def checker(current_user: User = Depends(get_current_user)) -> User:
        if any(has_permission(current_user, p) for p in permissions):
            return current_user
        raise HTTPException(status_code=403, detail=f"Access denied: requires one of [{', '.join(permissions)}].")
    return checker


# ==========================================
# Activity Logging
# ==========================================


def log_activity(
    db: Session,
    action: str,
    actor_id: str = "system",
    actor_username: str = "system",
    actor_role: str = "system",
    target: str = "N/A",
    details: str = "",
    ip: str = "127.0.0.1",
):
    try:
        db.add(ActivityLog(
            id=f"log_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            actor_id=(actor_id or "system")[:64],
            actor_username=(actor_username or "system")[:100],
            actor_role=(actor_role or "system")[:50],
            action=action[:100],
            target=(target or "N/A")[:255],
            details=(details or "")[:2000],
            ip=(ip or "")[:64],
        ))
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error("Failed to write activity log: %s", e)
