from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Dict, Any

from database.session import get_db
from database.models import User, Policy
from security.dependencies import get_current_user

router = APIRouter()

@router.get("/")
def list_policies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policies = db.query(Policy).order_by(Policy.priority.asc()).all()
    return policies

@router.post("/")
def create_policy(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Simplistic creation for now. In a real app, you'd use a Pydantic schema and PolicyManager
    try:
        new_policy = Policy(
            name=payload.get("name"),
            description=payload.get("description"),
            priority=payload.get("priority", 0),
            enabled=payload.get("enabled", True),
            conditions=payload.get("conditions", {}),
            action=payload.get("action", "BLOCK")
        )
        db.add(new_policy)
        db.commit()
        db.refresh(new_policy)
        return new_policy
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{policy_id}")
def update_policy(
    policy_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    for key, value in payload.items():
        if hasattr(policy, key):
            setattr(policy, key, value)
            
    db.commit()
    db.refresh(policy)
    return policy

@router.delete("/{policy_id}")
def delete_policy(
    policy_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    db.delete(policy)
    db.commit()
    return {"status": "success", "message": "Policy deleted"}
