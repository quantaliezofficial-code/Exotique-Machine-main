import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User
from backend.schemas import LoginRequest, ChangeOwnPasswordRequest, UpdateOwnProfileRequest
from backend.security import (
    hash_password,
    verify_password,
    dummy_verify,
    validate_new_password,
    create_access_token,
    set_session_cookie,
    clear_session_cookie,
    check_brute_force,
    record_failed_attempt,
    clear_failed_attempts,
    enforce_rate_limit,
    log_activity,
    get_current_user,
    get_current_user_allow_pending,
    get_client_ip,
    _resolve_user,
)
from backend.permissions import PERMISSIONS, ROLE_PRESETS

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

GENERIC_LOGIN_ERROR = "Invalid username or password"


def _session_response(response: Response, user: User) -> dict:
    token = create_access_token(user)
    set_session_cookie(response, token)
    # The session token lives only in the httpOnly cookie: never in the response body,
    # where any injected script could read it. Script clients can read Set-Cookie.
    return {"user": user.to_dict()}


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    enforce_rate_limit(request, "login", settings.LOGIN_IP_LIMIT_PER_15_MIN, 900)
    clean_username = payload.username.strip().lower()

    brute_check = check_brute_force(clean_username)
    if brute_check.get("is_locked"):
        log_activity(db, action="LOGIN_BLOCKED_BRUTE_FORCE", actor_username=clean_username,
                     target=clean_username, details=brute_check.get("message", ""), ip=client_ip)
        raise HTTPException(status_code=429, detail=brute_check.get("message"))

    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        dummy_verify()  # equalise response time
        record_failed_attempt(clean_username)
        log_activity(db, action="LOGIN_FAILED", actor_username=clean_username, target=clean_username,
                     details="Unknown username", ip=client_ip)
        raise HTTPException(status_code=401, detail=GENERIC_LOGIN_ERROR)

    if not verify_password(payload.password, user.password_hash):
        record_failed_attempt(clean_username)
        log_activity(db, action="LOGIN_FAILED", actor_id=user.id, actor_username=user.username,
                     actor_role=user.role, target=user.username, details="Incorrect password", ip=client_ip)
        raise HTTPException(status_code=401, detail=GENERIC_LOGIN_ERROR)

    # Only reveal the deactivated state after the password is proven.
    if user.status == "deactivated":
        log_activity(db, action="LOGIN_REJECTED_DEACTIVATED", actor_id=user.id, actor_username=user.username,
                     actor_role=user.role, target=user.username, ip=client_ip)
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact Super Admin.")

    clear_failed_attempts(clean_username)
    user.last_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    log_activity(db, action="LOGIN_SUCCESS", actor_id=user.id, actor_username=user.username,
                 actor_role=user.role, target=user.username,
                 details=f"Login as {user.role}. mustChangePassword={bool(user.must_change_password)}", ip=client_ip)
    return _session_response(response, user)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db),
           current_user: User = Depends(get_current_user_allow_pending)):
    # Revoke every outstanding token for this account.
    current_user.token_version = int(current_user.token_version or 0) + 1
    db.commit()
    clear_session_cookie(response)
    log_activity(db, action="LOGOUT", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=current_user.username, ip=get_client_ip(request))
    return {"success": True}


@router.get("/session")
def get_session(request: Request, db: Session = Depends(get_db)):
    """Who is signed in on this browser, without treating "nobody" as an error.
    Used by the admin page on load (a 401 there is expected, not a failure)."""
    if not request.cookies.get(settings.AUTH_COOKIE_NAME):
        return {"user": None}
    try:
        return {"user": _resolve_user(request, None, db).to_dict()}
    except HTTPException:
        return {"user": None}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user_allow_pending)):
    return {"user": current_user.to_dict()}


@router.get("/permissions")
def list_permissions(current_user: User = Depends(get_current_user)):
    return {"permissions": PERMISSIONS, "presets": ROLE_PRESETS}


@router.post("/change-own-password")
def change_own_password(payload: ChangeOwnPasswordRequest, request: Request, response: Response,
                        current_user: User = Depends(get_current_user_allow_pending),
                        db: Session = Depends(get_db)):
    validate_new_password(payload.newPassword)
    # The current password is always required, including for forced changes: the forced
    # flow is reached by logging in with the temporary password, which the user knows.
    if not payload.currentPassword or not verify_password(payload.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if verify_password(payload.newPassword, current_user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from the current one.")

    current_user.password_hash = hash_password(payload.newPassword)
    current_user.must_change_password = False
    current_user.token_version = int(current_user.token_version or 0) + 1  # log out other sessions
    current_user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    log_activity(db, action="PASSWORD_CHANGED_OWN", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=current_user.username, ip=get_client_ip(request))
    result = _session_response(response, current_user)
    result.update({"success": True, "message": "Your password has been changed. Other sessions were signed out."})
    return result


@router.post("/update-own-profile")
def update_own_profile(payload: UpdateOwnProfileRequest, request: Request, response: Response,
                       current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    clean_username = payload.username.strip().lower()
    if len(clean_username) < 3 or not clean_username.replace("_", "").replace(".", "").replace("-", "").isalnum():
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters (letters, digits, . _ -).")
    if not verify_password(payload.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    if clean_username != current_user.username:
        if db.query(User).filter(User.username == clean_username, User.id != current_user.id).first():
            raise HTTPException(status_code=400, detail=f'Username "{clean_username}" is already in use.')

    old_username = current_user.username
    current_user.username = clean_username
    if payload.name and payload.name.strip():
        current_user.name = payload.name.strip()
    current_user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    log_activity(db, action="USERNAME_CHANGED_OWN", actor_id=current_user.id, actor_username=current_user.username,
                 actor_role=current_user.role, target=clean_username,
                 details=f'username "{old_username}" -> "{clean_username}"', ip=get_client_ip(request))
    result = _session_response(response, current_user)
    result.update({"success": True, "message": f'Username updated to "@{clean_username}".'})
    return result
