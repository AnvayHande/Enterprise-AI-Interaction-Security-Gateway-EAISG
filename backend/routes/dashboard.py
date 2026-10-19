from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Dict, Any, List
from datetime import datetime, timedelta, timezone

from database.session import get_db
from database.models import User, Request, Finding, Policy, Department, AIDestination
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
    requests = db.query(Request, AIDestination.name, User.username).outerjoin(
        AIDestination, Request.destination_id == AIDestination.id
    ).outerjoin(
        User, Request.user_id == User.id
    ).order_by(desc(Request.created_at)).offset(skip).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "username": username or f"User {r.user_id}",
            "destination_id": r.destination_id,
            "ai_model": ai_name or "Unknown AI",
            "status": r.status,
            "final_action": r.final_action,
            "risk_score": r.risk_score,
            "created_at": r.created_at.replace(tzinfo=timezone.utc) if r.created_at else None
        } for r, ai_name, username in requests
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
        Department.name,
        func.count(Request.id).label("total_requests"),
        func.avg(Request.risk_score).label("avg_risk")
    ).outerjoin(
        Department, User.department_id == Department.id
    ).join(
        Request, User.id == Request.user_id
    ).filter(
        Request.created_at >= cutoff
    ).group_by(User.username, Department.name).all()
    
    return [
        {
            "username": u[0],
            "department": u[1] or "General",
            "total_requests": u[2],
            "avg_risk": round(u[3] or 0.0, 2)
        } for u in user_risks
    ]

@router.get("/requests/{request_id}/findings")
def get_request_findings(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    findings = db.query(Finding).filter(Finding.request_id == request_id).all()
    return [
        {
            "id": f.id,
            "category": f.category,
            "severity": "CRITICAL" if f.confidence > 0.8 else ("HIGH" if f.confidence > 0.5 else "LOW"),
            "description": f"Detected potential {f.category} (confidence: {f.confidence*100:.1f}%). Redacted content: {f.evidence}" if f.evidence else f"Detected potential {f.category} (confidence: {f.confidence*100:.1f}%)."
        } for f in findings
    ]

@router.get("/critical")
def get_critical_requests(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from database.models import AIDestination
    requests = db.query(Request, AIDestination.name, User.username).outerjoin(
        AIDestination, Request.destination_id == AIDestination.id
    ).outerjoin(
        User, Request.user_id == User.id
    ).filter(
        Request.final_action == "BLOCK"
    ).order_by(desc(Request.created_at)).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "username": username or f"User {r.user_id}",
            "destination_id": r.destination_id,
            "ai_model": ai_name or "Unknown AI",
            "status": r.status,
            "final_action": r.final_action,
            "risk_score": r.risk_score,
            "created_at": r.created_at.replace(tzinfo=timezone.utc) if r.created_at else None
        } for r, ai_name, username in requests
    ]
