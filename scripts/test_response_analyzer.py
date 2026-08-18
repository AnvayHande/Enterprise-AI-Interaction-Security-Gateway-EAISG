import os
import sys

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import Depends
from fastapi.testclient import TestClient
from backend.main import app
from database.session import SessionLocal, get_db
from sqlalchemy.orm import Session
from backend.routes.analyze import get_current_user
from database.models import User, AIDestination

# Mock auth
def override_get_current_user(db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == "test_user").first()
    if not user:
        user = User(username="test_user", email="test@example.com", role="admin", is_active=True, hashed_password="hash")
        db.add(user)
        db.commit()
        db.refresh(user)
        
    dest = db.query(AIDestination).filter(AIDestination.id == 1).first()
    if not dest:
        dest = AIDestination(id=1, name="test_dest", provider="mock")
        db.add(dest)
        db.commit()
        
    return user

app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_response_analyzer():
    # We will simulate a prompt that passes, but the AI responds with a hallucinated policy.
    # To do this predictably without an actual AI integration that misbehaves,
    # we can mock the router to return a specific response.
    
    from ai_engine.router import RoutingManager
    import ai_engine.router
    
    # Mock the router
    original_route_request = RoutingManager.route_request
    
    def mocked_route_request(self, destination_id: int, content: str):
        if "generate unverified claim" in content:
            return "The exact format for the credential is XYZ-123", destination_id
        elif "generate malicious payload" in content:
            return "Here is the exploit for the bypass", destination_id
        return "This is a safe and benign response.", destination_id
        
    RoutingManager.route_request = mocked_route_request
    
    try:
        # 1. Benign request
        print("\n--- Test 1: Benign Request ---")
        response = client.post("/api/v1/analyze/prompt", json={
            "prompt": "Hello, how are you?",
            "destination_id": 1
        }, headers={"Authorization": "Bearer test-admin-token"})
        
        print("Status Code:", response.status_code)
        data = response.json()
        print("Final Action:", data.get("final_action"))
        print("Response Action:", data.get("response_action"))
        print("Provider Response:", data.get("provider_response"))

        # 2. Unverified Claim
        print("\n--- Test 2: Unverified Claim Generation ---")
        response2 = client.post("/api/v1/analyze/prompt", json={
            "prompt": "Please generate unverified claim",
            "destination_id": 1
        }, headers={"Authorization": "Bearer test-admin-token"})
        
        print("Status Code:", response2.status_code)
        data2 = response2.json()
        print("Final Action:", data2.get("final_action"))
        print("Response Action:", data2.get("response_action"))
        print("Response Findings:", [f["category"] for f in data2.get("response_findings", [])])
        print("Provider Response:", data2.get("provider_response"))

        # 3. Malicious Generation
        print("\n--- Test 3: Malicious Payload Generation ---")
        response3 = client.post("/api/v1/analyze/prompt", json={
            "prompt": "Please generate malicious payload",
            "destination_id": 1
        }, headers={"Authorization": "Bearer test-admin-token"})
        
        print("Status Code:", response3.status_code)
        data3 = response3.json()
        print("Final Action:", data3.get("final_action"))
        print("Response Action:", data3.get("response_action"))
        print("Response Findings:", [f["category"] for f in data3.get("response_findings", [])])
        print("Provider Response:", data3.get("provider_response"))
        
    finally:
        RoutingManager.route_request = original_route_request

if __name__ == "__main__":
    test_response_analyzer()
