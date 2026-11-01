from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.database import get_db
from backend.models import ActivityLog, User
from backend.security import require_permission

router = APIRouter(prefix="/api/activity-logs", tags=["Activity Audit Logs"])

@router.get("")
def get_activity_logs(
    limit: int = Query(default=100, ge=1, le=1000),
    action: Optional[str] = None,
    actor: Optional[str] = None,
    current_user: User = Depends(require_permission("logs:view")),
    db: Session = Depends(get_db)
):
    query = db.query(ActivityLog)

    if action and action.lower() != "all":
        query = query.filter(ActivityLog.action.ilike(f"%{action.strip()}%"))

    if actor and actor.lower() != "all":
        query = query.filter(ActivityLog.actor_username.ilike(f"%{actor.strip()}%"))

    logs = query.order_by(desc(ActivityLog.timestamp)).limit(limit).all()

    return {
        "success": True,
        "count": len(logs),
        "logs": [log.to_dict() for log in logs]
    }
