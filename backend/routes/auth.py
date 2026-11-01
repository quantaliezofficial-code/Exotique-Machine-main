import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import (
    LoginRequest,
    LoginResponse,
    ChangeOwnPasswordRequest,
    UpdateOwnProfileRequest,
    AdminUserResponse
)
from backend.security import (
    hash_password,
    verify_password,
    create_access_token,
    check_brute_force,
    record_failed_attempt,
    clear_failed_attempts,
    log_activity,
    get_current_user
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def get_client_ip(request: Request) -> str:
    """Extract client IP from proxy headers or direct client."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    client_ip = get_client_ip(request)
    username = payload.username.strip()
    password = payload.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password are required")

    clean_username = username.lower()

    # 1. Check brute force
    brute_check = check_brute_force(clean_username)
    if brute_check.get("is_locked"):
        log_activity(
            db=db,
            actor_username=clean_username,
            action="LOGIN_BLOCKED_BRUTE_FORCE",
            target=clean_username,
            details=brute_check.get("message", ""),
            ip=client_ip
        )
        raise HTTPException(status_code=429, detail=brute_check.get("message"))

    # 2. Look up user
    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        record_failed_attempt(clean_username)
        log_activity(
            db=db,
            actor_username=clean_username,
            action="LOGIN_FAILED",
            target=clean_username,
            details="Invalid username attempt",
            ip=client_ip
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # 3. Check account status
    if user.status == "deactivated":
        log_activity(
            db=db,
            actor_id=user.id,
            actor_username=user.username,
            actor_role=user.role,
            action="LOGIN_REJECTED_DEACTIVATED",
            target=user.username,
            details="Deactivated account attempted login",
            ip=client_ip
        )
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact Super Admin.")

    # 4. Verify password
    if not verify_password(password, user.password_hash):
        record_failed_attempt(clean_username)
        log_activity(
            db=db,
            actor_id=user.id,
            actor_username=user.username,
            actor_role=user.role,
            action="LOGIN_FAILED",
            target=user.username,
            details="Incorrect password provided",
            ip=client_ip
        )
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # 5. Clear failed attempts & update last login
    clear_failed_attempts(clean_username)
    user.last_login = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    # 6. Issue JWT Token
    token_payload = {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "name": user.name,
        "permissions": user.permissions or [],
        "mustChangePassword": bool(user.must_change_password)
    }
    token = create_access_token(token_payload)

    log_activity(
        db=db,
        actor_id=user.id,
        actor_username=user.username,
        actor_role=user.role,
        action="LOGIN_SUCCESS",
        target=user.username,
        details=f"Successful login as {user.role}. MustChangePassword: {bool(user.must_change_password)}",
        ip=client_ip
    )

    return {
        "token": token,
        "user": user.to_dict()
    }


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve active session user profile."""
    return {"user": current_user.to_dict()}


@router.post("/change-own-password")
def change_own_password(
    payload: ChangeOwnPasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)

    if not payload.newPassword or len(payload.newPassword) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long.")

    # Verify current password if user is not forced to change password
    if not current_user.must_change_password:
        if not payload.currentPassword:
            raise HTTPException(status_code=400, detail="Current password is required to verify identity.")
        if not verify_password(payload.currentPassword, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect.")

    current_user.password_hash = hash_password(payload.newPassword)
    current_user.must_change_password = False
    current_user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="PASSWORD_CHANGED_OWN",
        target=current_user.username,
        details="User updated their personal password successfully.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": "Your password has been changed securely."
    }


@router.post("/update-own-profile")
def update_own_profile(
    payload: UpdateOwnProfileRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    new_username = payload.username.strip()

    if not new_username or len(new_username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters long.")

    clean_username = new_username.lower()

    if not payload.currentPassword:
        raise HTTPException(status_code=400, detail="Current password is required to verify identity before changing username.")

    if not verify_password(payload.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    # Check uniqueness if username changed
    if clean_username != current_user.username:
        exists = db.query(User).filter(User.username == clean_username, User.id != current_user.id).first()
        if exists:
            raise HTTPException(status_code=400, detail=f'Username "{new_username}" is already in use by another account.')

    old_username = current_user.username
    current_user.username = clean_username
    if payload.name and payload.name.strip():
        current_user.name = payload.name.strip()

    current_user.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    # Re-issue token with new username & name
    token_payload = {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role,
        "name": current_user.name,
        "permissions": current_user.permissions or [],
        "mustChangePassword": bool(current_user.must_change_password)
    }
    new_token = create_access_token(token_payload)

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="USERNAME_CHANGED_OWN",
        target=clean_username,
        details=f'User updated identity: username changed from "{old_username}" to "{clean_username}", name: "{current_user.name}".',
        ip=client_ip
    )

    return {
        "success": True,
        "message": f'Username updated to "@{clean_username}" successfully!',
        "token": new_token,
        "user": current_user.to_dict()
    }
