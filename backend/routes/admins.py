import time
import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import User
from backend.schemas import (
    CreateAdminRequest,
    UpdateAdminRequest,
    ResetAdminPasswordRequest,
    ToggleAdminStatusRequest
)
from backend.security import (
    hash_password,
    require_superadmin,
    log_activity,
    validate_new_password,
    get_client_ip,
)
from backend.permissions import DEFAULT_ADMIN_PERMISSIONS, ROLE_PRESETS, clean_permissions

router = APIRouter(prefix="/api/auth/admins", tags=["Super Admin - Staff Management"])



def _resolve_permissions(permissions, preset):
    if preset and preset in ROLE_PRESETS and permissions is None:
        return list(ROLE_PRESETS[preset]["permissions"])
    cleaned = clean_permissions(permissions)
    return cleaned

@router.get("")
def list_admins(
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    safe_admins = [u.to_dict() for u in users]
    return {"success": True, "admins": safe_admins}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_admin(
    payload: CreateAdminRequest,
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    username = payload.username.strip()
    clean_username = username.lower()

    if not username or not payload.temporaryPassword:
        raise HTTPException(status_code=400, detail="Username and temporary password are required")

    validate_new_password(payload.temporaryPassword)

    # Check if username exists
    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=400, detail=f'Username "{username}" is already in use.')

    if payload.permissions is None and not payload.rolePreset:
        assigned_permissions = list(DEFAULT_ADMIN_PERMISSIONS)
    else:
        assigned_permissions = _resolve_permissions(payload.permissions, payload.rolePreset)

    new_id = f"usr_{int(time.time() * 1000)}_{uuid.uuid4().hex[:5]}"
    password_hash = hash_password(payload.temporaryPassword)

    new_admin = User(
        id=new_id,
        username=clean_username,
        name=payload.name.strip() if payload.name else "Staff Admin",
        password_hash=password_hash,
        role="admin",
        role_preset=payload.rolePreset if payload.rolePreset in ROLE_PRESETS else None,
        permissions=assigned_permissions,
        token_version=0,
        status="active",
        must_change_password=True,
        created_at=datetime.datetime.now(datetime.timezone.utc)
    )

    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="ADMIN_CREATED",
        target=clean_username,
        details=f"Created Admin account with permissions: [{', '.join(assigned_permissions)}]. Temporary password assigned with mustChangePassword=true.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": f'Admin account "{clean_username}" created successfully.',
        "admin": new_admin.to_dict()
    }


@router.put("/{user_id}")
def update_admin(
    user_id: str,
    payload: UpdateAdminRequest,
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    target = db.query(User).filter(User.id == user_id).first()

    if not target:
        raise HTTPException(status_code=404, detail="Admin account not found")

    if target.role == "superadmin" and target.id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify another Super Admin account.")

    if payload.username:
        clean_username = payload.username.strip().lower()
        if clean_username != target.username:
            exists = db.query(User).filter(User.username == clean_username, User.id != user_id).first()
            if exists:
                raise HTTPException(status_code=400, detail=f'Username "{payload.username}" is already taken.')
            target.username = clean_username

    if payload.name is not None:
        target.name = payload.name.strip()

    if target.role != "superadmin" and (payload.permissions is not None or payload.rolePreset):
        new_perms = _resolve_permissions(payload.permissions, payload.rolePreset)
        if set(new_perms) != set(target.permissions or []):
            target.token_version = int(target.token_version or 0) + 1
        target.permissions = new_perms
        target.role_preset = payload.rolePreset if payload.rolePreset in ROLE_PRESETS else None

    target.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    db.refresh(target)

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="ADMIN_UPDATED",
        target=target.username,
        details=f"Updated name/username/permissions for {target.username}.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": f'Admin account "{target.username}" updated successfully.',
        "admin": target.to_dict()
    }


@router.post("/{user_id}/reset-password")
def reset_admin_password(
    user_id: str,
    payload: ResetAdminPasswordRequest,
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)

    validate_new_password(payload.temporaryPassword)

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Admin account not found")
    if target.role == "superadmin" and target.id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot reset another Super Admin's password.")

    target.password_hash = hash_password(payload.temporaryPassword)
    target.token_version = int(target.token_version or 0) + 1
    if target.id != current_user.id:
        target.must_change_password = True

    target.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="ADMIN_PASSWORD_RESET",
        target=target.username,
        details=f"Super Admin reset password for {target.username}. mustChangePassword set to {target.must_change_password}.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": f"Password reset successfully for {target.username}. They will be prompted to choose a new password upon login."
    }


@router.patch("/{user_id}/status")
def toggle_admin_status(
    user_id: str,
    payload: ToggleAdminStatusRequest,
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)

    if payload.status not in ["active", "deactivated"]:
        raise HTTPException(status_code=400, detail='Status must be "active" or "deactivated".')

    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Admin account not found")

    if target.role == "superadmin":
        raise HTTPException(status_code=403, detail="Super Admin account cannot be deactivated.")

    target.status = payload.status
    target.token_version = int(target.token_version or 0) + 1
    target.updated_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="ADMIN_ACTIVATED" if payload.status == "active" else "ADMIN_DEACTIVATED",
        target=target.username,
        details=f"Super Admin changed status of {target.username} to {payload.status}.",
        ip=client_ip
    )

    return {
        "success": True,
        "message": f'Admin account "{target.username}" is now {payload.status}.',
        "status": payload.status
    }


@router.delete("/{user_id}")
def delete_admin(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_superadmin),
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(request)
    target = db.query(User).filter(User.id == user_id).first()

    if not target:
        raise HTTPException(status_code=404, detail="Admin account not found")

    if target.role == "superadmin":
        raise HTTPException(status_code=403, detail="Super Admin account cannot be deleted.")

    deleted_username = target.username
    deleted_name = target.name

    db.delete(target)
    db.commit()

    log_activity(
        db=db,
        actor_id=current_user.id,
        actor_username=current_user.username,
        actor_role=current_user.role,
        action="ADMIN_DELETED",
        target=deleted_username,
        details=f"Super Admin deleted admin account {deleted_username} ({deleted_name}).",
        ip=client_ip
    )

    return {
        "success": True,
        "message": f'Admin account "{deleted_username}" deleted successfully.'
    }
