from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database.session import get_db
from database.models import User, Session as DBSession
from security.auth import verify_password, create_access_token, create_refresh_token
from backend.schemas.auth import Token, UserResponse, UserCreate

router = APIRouter()

@router.post("/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    refresh_token = create_refresh_token(data={"sub": user.username})
    
    # Store refresh token in db for revocation capability
    db_session = DBSession(user_id=user.id, refresh_token=refresh_token, expires_at=datetime.now(timezone.utc))
    db.add(db_session)
    db.commit()

    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@router.post("/logout")
def logout(refresh_token: str, db: Session = Depends(get_db)):
    db_session = db.query(DBSession).filter(DBSession.refresh_token == refresh_token).first()
    if db_session:
        db.delete(db_session)
        db.commit()
    return {"message": "Logged out successfully"}
