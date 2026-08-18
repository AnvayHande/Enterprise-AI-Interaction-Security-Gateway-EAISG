import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.session import SessionLocal
from database.models import AuditLog, User
from sqlalchemy.orm import Session

def test_audit_immutability():
    db: Session = SessionLocal()
    
    try:
        # Create a dummy user
        user = db.query(User).filter(User.username == "audit_tester").first()
        if not user:
            user = User(username="audit_tester", email="audit@test.com", role="admin", hashed_password="hash", is_active=True)
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create an audit log
        audit = AuditLog(
            event_type="TEST_EVENT",
            actor_id=user.id,
            target_id="123",
            meta_data={"test": True}
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        
        print("Successfully created AuditLog.")
        
        # Test Update
        try:
            audit.event_type = "HACKED_EVENT"
            db.commit()
            print("ERROR: Update succeeded! This should not happen.")
            sys.exit(1)
        except Exception as e:
            db.rollback()
            print(f"Update properly blocked: {e}")
            
        # Test Delete
        try:
            db.delete(audit)
            db.commit()
            print("ERROR: Delete succeeded! This should not happen.")
            sys.exit(1)
        except Exception as e:
            db.rollback()
            print(f"Delete properly blocked: {e}")
            
    finally:
        db.close()
        print("Test completed.")

if __name__ == "__main__":
    test_audit_immutability()
