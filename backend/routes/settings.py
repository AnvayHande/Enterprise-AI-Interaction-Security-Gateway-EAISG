from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database.session import get_db
from database.models import User, AIDestination
from security.dependencies import get_current_user

router = APIRouter()

@router.get("/destinations")
def list_destinations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    destinations = db.query(AIDestination).all()
    return destinations

@router.post("/destinations")
def create_destination(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        new_dest = AIDestination(
            name=payload.get("name"),
            provider=payload.get("provider"),
            trust_level=payload.get("trust_level", "PUBLIC"),
            fallback_destination_id=payload.get("fallback_destination_id"),
            base_url=payload.get("base_url"),
            api_version=payload.get("api_version"),
            is_active=payload.get("is_active", True)
        )
        db.add(new_dest)
        db.commit()
        db.refresh(new_dest)
        return new_dest
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/destinations/{destination_id}")
def update_destination(
    destination_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dest = db.query(AIDestination).filter(AIDestination.id == destination_id).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
        
    for key, value in payload.items():
        if hasattr(dest, key):
            setattr(dest, key, value)
            
    db.commit()
    db.refresh(dest)
    return dest
