from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from database.session import get_db
from database.models import User, Department, AIDestination, SystemSetting
from security.dependencies import get_current_user, require_role
from security.auth import get_password_hash

router = APIRouter()

# --- AI Destinations ---

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

# --- User Management ---

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).order_by(User.id.asc()).all()
    result = []
    for u in users:
        result.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "department_id": u.department_id,
            "department_name": u.department.name if u.department else "General",
            "is_active": u.is_active,
            "created_at": u.created_at
        })
    return result

@router.post("/users")
def create_user(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    username = payload.get("username", "").strip()
    email = payload.get("email", "").strip()
    password = payload.get("password", "").strip()
    role = payload.get("role", "EMPLOYEE").strip().upper()
    department_id = payload.get("department_id")

    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required")

    existing = db.query(User).filter((User.username == username) | (User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    hashed_pw = get_password_hash(password)
    new_user = User(
        username=username,
        email=email,
        hashed_password=hashed_pw,
        role=role,
        department_id=department_id if department_id else None,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role,
        "department_id": new_user.department_id,
        "department_name": new_user.department.name if new_user.department else "General",
        "is_active": new_user.is_active
    }

@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "role" in payload:
        user.role = payload["role"].upper()
    if "department_id" in payload:
        user.department_id = payload["department_id"] if payload["department_id"] else None
    if "is_active" in payload:
        user.is_active = bool(payload["is_active"])
    if "password" in payload and payload["password"]:
        user.hashed_password = get_password_hash(payload["password"])

    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "department_id": user.department_id,
        "department_name": user.department.name if user.department else "General",
        "is_active": user.is_active
    }

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own user account")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"status": "success", "message": f"User {user.username} deleted"}

# --- Departments ---

@router.get("/departments")
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Department).order_by(Department.name.asc()).all()

@router.post("/departments")
def create_department(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Department name is required")
    existing = db.query(Department).filter(Department.name == name).first()
    if existing:
        return existing
    dept = Department(name=name)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept

# --- Risk Weights ---

DEFAULT_RISK_WEIGHTS = {
    "boost_amount": 0.15,
    "max_score": 1.0,
    "low_risk_threshold": 0.40,
    "high_risk_threshold": 0.80
}

@router.get("/risk-weights")
def get_risk_weights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == "risk_weights").first()
    if setting and setting.value:
        return {**DEFAULT_RISK_WEIGHTS, **setting.value}
    return DEFAULT_RISK_WEIGHTS

@router.put("/risk-weights")
def update_risk_weights(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = db.query(SystemSetting).filter(SystemSetting.key == "risk_weights").first()
    clean_values = {
        "boost_amount": float(payload.get("boost_amount", 0.15)),
        "max_score": float(payload.get("max_score", 1.0)),
        "low_risk_threshold": float(payload.get("low_risk_threshold", 0.40)),
        "high_risk_threshold": float(payload.get("high_risk_threshold", 0.80))
    }
    if not setting:
        setting = SystemSetting(key="risk_weights", value=clean_values)
        db.add(setting)
    else:
        setting.value = clean_values

    db.commit()
    return clean_values

