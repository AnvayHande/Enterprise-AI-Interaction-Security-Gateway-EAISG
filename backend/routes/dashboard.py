from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone

from database.session import get_db
from database.models import User, Request, Finding, Policy, Department
from security.dependencies import get_current_user

router = APIRouter()

@router.get("/overview")
def get_overview_stats(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    total_requests = db.query(Request).filter(Request.created_at >= cutoff).count()
    
    decisions = db.query(
        Request.final_action, func.count(Request.id)
    ).filter(
        Request.created_at >= cutoff
    ).group_by(Request.final_action).all()
    decisions_breakdown = {d[0] or "UNKNOWN": d[1] for d in decisions}
    
    avg_risk = db.query(func.avg(Request.risk_score)).filter(Request.created_at >= cutoff).scalar() or 0.0

    return {
        "total_requests": total_requests,
        "decisions": decisions_breakdown,
        "average_risk": round(avg_risk, 2)
    }

@router.get("/requests")
def get_requests(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    requests = db.query(Request).order_by(desc(Request.created_at)).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "destination_id": r.destination_id,
            "status": r.status,
            "final_action": r.final_action,
            "risk_score": r.risk_score,
            "created_at": r.created_at
        } for r in requests
    ]

@router.get("/findings")
def get_findings_stats(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    findings = db.query(
        Finding.category, func.count(Finding.id)
    ).filter(
        Finding.created_at >= cutoff
    ).group_by(Finding.category).all()
    
    return [{"category": f[0], "count": f[1]} for f in findings]

@router.get("/users")
def get_users_risk(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    user_risks = db.query(
        User.username,
        func.count(Request.id).label("total_requests"),
        func.avg(Request.risk_score).label("avg_risk")
    ).join(Request).filter(
        Request.created_at >= cutoff
    ).group_by(User.username).all()
    
    return [
        {
            "username": u[0],
            "total_requests": u[1],
            "avg_risk": round(u[2] or 0.0, 2)
        } for u in user_risks
    ]
