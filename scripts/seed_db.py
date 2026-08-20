import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.session import SessionLocal, engine
from database.models import Base, User, Department, Policy, AIDestination
from security.auth import get_password_hash

def seed():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # 1. Create Department
        dept = db.query(Department).filter_by(name="IT").first()
        if not dept:
            dept = Department(name="IT")
            db.add(dept)
            db.commit()
            db.refresh(dept)
            print("Created IT department.")
        
        # 2. Create Admin User
        admin = db.query(User).filter_by(username="admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin"),
                role="ADMIN",
                department_id=dept.id,
                is_active=True
            )
            db.add(admin)
            db.commit()
            print("Created admin user.")
            
        # 3. Create Default Destination
        dest = db.query(AIDestination).filter_by(name="Default Internal AI").first()
        if not dest:
            dest = AIDestination(
                name="Default Internal AI",
                provider="dummy",
                trust_level="INTERNAL",
                base_url="http://dummy-internal",
                is_active=True
            )
            db.add(dest)
            db.commit()
            print("Created default AI destination.")
            
        # 4. Create a Default Policy (Allow Low Risk, Block High Risk)
        policy = db.query(Policy).filter_by(name="Global High Risk Block").first()
        if not policy:
            policy = Policy(
                name="Global High Risk Block",
                description="Block anything with confidence > 0.7",
                priority=100,
                enabled=True,
                action="BLOCK",
                conditions={"min_confidence": 0.7}
            )
            db.add(policy)
            db.commit()
            print("Created default policy.")
            
        print("Database seeding complete!")
        
    finally:
        db.close()

if __name__ == "__main__":
    seed()
