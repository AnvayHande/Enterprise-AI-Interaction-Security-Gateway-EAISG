from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from database.session import get_db
from database.models import Request, Appeal, User, AuditLog
from security.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(tags=["Reviews & Appeals"])

class AppealCreate(BaseModel):
    reason: str

class ReviewDecision(BaseModel):
    action: str # ALLOW or BLOCK
    reason: Optional[str] = None

@router.get("/pending")
def get_pending_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all requests pending manual approval. (Admin/Analyst only in a real app)"""
    stmt = select(Request).where(Request.final_action == "APPROVAL_PENDING")
    requests = db.execute(stmt).scalars().all()
    
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "risk_score": r.risk_score,
            "created_at": r.created_at
        } for r in requests
    ]

@router.post("/{request_id}/approve")
def approve_pending_request(
    request_id: int,
    decision: ReviewDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve or deny a request stuck in APPROVAL_PENDING."""
    if decision.action not in ["ALLOW", "BLOCK"]:
        raise HTTPException(status_code=400, detail="Action must be ALLOW or BLOCK")

    req = db.get(Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req.final_action != "APPROVAL_PENDING":
        raise HTTPException(status_code=400, detail="Request is not pending approval")

    req.final_action = decision.action
    
    audit_log = AuditLog(
        event_type="MANUAL_REVIEW_DECISION",
        actor_id=current_user.id,
        target_id=str(req.id),
        meta_data={"action": decision.action, "reason": decision.reason}
    )
    db.add(audit_log)
    db.commit()

    return {"status": "success", "new_action": decision.action}

@router.post("/{request_id}/appeal")
def submit_appeal(
    request_id: int,
    appeal: AppealCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """User appeals a blocked request."""
    req = db.get(Request, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")

    if req.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot appeal someone else's request")

    if req.final_action != "BLOCK":
        raise HTTPException(status_code=400, detail="Only BLOCKED requests can be appealed")

    new_appeal = Appeal(
        request_id=request_id,
        user_id=current_user.id,
        reason=appeal.reason,
        status="PENDING"
    )
    db.add(new_appeal)

    audit_log = AuditLog(
        event_type="APPEAL_SUBMITTED",
        actor_id=current_user.id,
        target_id=str(req.id),
        meta_data={"reason": appeal.reason}
    )
    db.add(audit_log)
    db.commit()

    return {"status": "success", "appeal_id": new_appeal.id}
