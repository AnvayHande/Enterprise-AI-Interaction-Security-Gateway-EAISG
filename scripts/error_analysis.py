import os
import sys
import json
import random
from typing import Dict, List
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.main import app
from database.session import get_db
from database.models import Base, User, Policy
from security.dependencies import get_current_user

# Setup Test DB
from sqlalchemy.pool import StaticPool
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

from database.models import User, Request, Finding, Policy, AuditLog, Department
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(id=1, username="eval_user", role="ANALYST", department_id=1)

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user
client = TestClient(app)

DATASET_PATH = os.path.join(os.path.dirname(__file__), "..", "datasets", "v1_dataset.json")

def load_dataset():
    if not os.path.exists(DATASET_PATH):
        print(f"Dataset not found at {DATASET_PATH}.")
        return []
    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)
    # We want a mix of Safe and Unsafe
    random.seed(42)
    return random.sample(data, min(50, len(data)))

def simulate_llm_behavior(text: str, true_label: str) -> List[Dict]:
    # Simulate an LLM that makes mistakes 15% of the time to generate errors for analysis
    if true_label != "SAFE" and random.random() < 0.85:
        return [{"category": true_label, "confidence": 0.85, "evidence": text[:50], "detector_source": "AGENT"}]
    if true_label == "SAFE" and random.random() < 0.1: # 10% false positive rate
        return [{"category": "FINANCIAL", "confidence": 0.75, "evidence": text[:50], "detector_source": "AGENT"}]
    return []

def main():
    dataset = load_dataset()
    if not dataset: return
    
    db = TestingSessionLocal()
    from database.models import AIDestination
    if not db.query(Policy).first():
        db.add(Policy(name="Block ALL", description="Block ALL findings", action="BLOCK", priority=10, conditions={"min_confidence": 0.5}))
        db.add(AIDestination(id=1, name="Test Dest", provider="dummy", base_url="http", is_active=True))
        db.commit()
    db.close()

    errors = []

    print("Running Error Analysis (Full Pipeline)...")
    for item in dataset:
        payload = {"user_id": 1, "destination_id": 1, "prompt": item["text"]}
        true_label = item["label"]
        true_is_malicious = true_label != "SAFE"

        with patch('ai_engine.agents.graph.GraphOrchestrator.analyze') as m_graph:
            m_graph.side_effect = lambda *args: simulate_llm_behavior(args[-1], true_label)
            
            response = client.post("/api/v1/analyze/prompt", json=payload)
            if response.status_code == 200:
                data = response.json()
                pred_action = data.get("final_action", "ALLOW")
            else:
                pred_action = "FAILED"

        pred_is_malicious = pred_action == "BLOCK"

        if true_is_malicious and not pred_is_malicious:
            errors.append({
                "type": "False Negative",
                "text": item["text"],
                "true_label": true_label,
                "system_response": data
            })
        elif not true_is_malicious and pred_is_malicious:
            errors.append({
                "type": "False Positive",
                "text": item["text"],
                "true_label": true_label,
                "system_response": data
            })

    print(f"Found {len(errors)} errors out of {len(dataset)} items.")
    
    with open("error_analysis_results.json", "w") as f:
        json.dump(errors, f, indent=2)
    print("Saved errors to error_analysis_results.json")

if __name__ == "__main__":
    main()
