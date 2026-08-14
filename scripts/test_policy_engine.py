import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import User, Policy, Request, Finding, Base
from policy_engine.manager import PolicyManager, PolicyConflictError
from policy_engine.evaluator import PolicyEvaluator

# Setup in-memory sqlite DB
engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)



def test_conflict_detection():
    db = SessionLocal()
    manager = PolicyManager(db)
    
    # Clean up existing policies for test
    db.query(Policy).delete()
    db.commit()

    print("Testing Policy Conflict Detection...")

    # 1. Create a base policy
    p1 = manager.create_policy(
        name="Block High Confidence PII",
        conditions={"category": "PII", "min_confidence": 0.8},
        action="BLOCK",
        priority=100,
        changed_by_user_id=1
    )
    print(f"Created base policy: {p1.name}")

    # 2. Try to create a contradictory policy (Same condition, WARN instead of BLOCK)
    try:
        manager.create_policy(
            name="Warn on High Confidence PII",
            conditions={"category": "PII", "min_confidence": 0.8},
            action="WARN",
            priority=50,
            changed_by_user_id=1
        )
        print("FAILED: Should have raised PolicyConflictError for contradiction")
    except PolicyConflictError as e:
        print(f"SUCCESS: Caught contradiction - {e}")

    # 3. Try to create an unreachable policy (Broader condition exists with higher priority)
    try:
        manager.create_policy(
            name="Block High Confidence PII specifically for HR",
            conditions={"category": "PII", "min_confidence": 0.8, "department_id": 2},
            action="BLOCK",
            priority=50, # Lower priority than the global block
            changed_by_user_id=1
        )
        print("FAILED: Should have raised PolicyConflictError for unreachable policy")
    except PolicyConflictError as e:
        print(f"SUCCESS: Caught unreachable policy - {e}")

    # 4. Create a valid non-conflicting policy
    p2 = manager.create_policy(
        name="Warn on Medium Confidence Secrets",
        conditions={"category": "CREDENTIAL", "min_confidence": 0.5},
        action="WARN",
        priority=90,
        changed_by_user_id=1
    )
    print(f"Created valid policy: {p2.name}")

    db.close()

def test_risk_based_fallback():
    print("\nTesting Risk-Based Fallback Defaults...")
    db = SessionLocal()
    evaluator = PolicyEvaluator(db)
    
    # We pass an empty findings list so NO policy matches.
    # We pass a mock user
    user = User(id=1, role="EMPLOYEE", department_id=1)

    action_low = evaluator.evaluate([], 0.2, user)
    print(f"Fallback for Low Risk (0.2): {action_low} (Expected ALLOW)")

    action_med = evaluator.evaluate([], 0.6, user)
    print(f"Fallback for Medium Risk (0.6): {action_med} (Expected WARN)")

    action_high = evaluator.evaluate([], 0.9, user)
    print(f"Fallback for High Risk (0.9): {action_high} (Expected BLOCK)")
    
    db.close()

if __name__ == "__main__":
    test_conflict_detection()
    test_risk_based_fallback()
