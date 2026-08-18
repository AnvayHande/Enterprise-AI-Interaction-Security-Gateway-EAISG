import asyncio
import sys
import os
import requests

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Normally we'd use TestClient, but since we want to test rate limits
# and background tasks, starting the actual server is better.
# For simplicity in this script, we'll just demonstrate the endpoints via a python script
# assuming the server is running, or we can use fastapi.testclient.

from fastapi.testclient import TestClient
from backend.main import app
from database.session import get_db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from database.models import Base, User

# Setup a test DB
engine = create_engine(
    'sqlite:///:memory:',
    connect_args={'check_same_thread': False},
    poolclass=StaticPool
)
Base.metadata.create_all(engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def setup_test_user():
    db = TestingSessionLocal()
    user = User(username="test_admin", email="test@eaisg.local", hashed_password="hashed", role="ADMIN", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user

def get_auth_token():
    # Login to get token
    response = client.post(
        "/api/v1/auth/token",
        data={"username": "test@eaisg.local", "password": "password123"}
    )
    # If auth fails (since password check might fail due to dummy hash), we'll bypass auth for test
    # Actually, we should just override get_current_user
    pass

from security.dependencies import get_current_user

def override_get_current_user():
    return User(id=1, email="test@eaisg.local", role="ADMIN")

app.dependency_overrides[get_current_user] = override_get_current_user


def test_validation_error():
    print("\n--- Testing 422 Validation Error ---")
    response = client.post("/api/v1/analyze/prompt", json={"wrong_field": "data"})
    assert response.status_code == 422
    data = response.json()
    print(data)
    assert data["error_code"] == "ERR_VALIDATION"
    print("SUCCESS: Structured error returned for validation failure.")


def test_idempotency_and_webhook():
    print("\n--- Testing Idempotency & Webhooks ---")
    
    # First request: should trigger a BLOCK because it contains a highly sensitive secret
    # (assuming our detectors flag "AKIA..." as high risk).
    payload = {
        "prompt": "Here are my AWS keys: AKIAIOSFODNN7EXAMPLE",
        "destination_id": 1
    }
    
    print("Sending Request 1...")
    response1 = client.post("/api/v1/analyze/prompt", json=payload)
    assert response1.status_code == 200
    data1 = response1.json()
    print(f"Action: {data1['final_action']}, Risk: {data1['risk_score']}")
    
    print("Sending Request 2 (Identical)...")
    response2 = client.post("/api/v1/analyze/prompt", json=payload)
    data2 = response2.json()
    
    assert data2["provider_response"] == "[CACHED RESPONSE]", "Response was not deduplicated!"
    print(f"Action: {data2['final_action']}, Provider: {data2['provider_response']}")
    print("SUCCESS: Deduplication cache hit.")


def test_rate_limiting():
    print("\n--- Testing Rate Limiting (30 req/min) ---")
    # We will spam 35 requests. The first 30 should pass, the last 5 should 429.
    
    success_count = 0
    fail_count = 0
    
    for i in range(35):
        payload = {"prompt": f"Spam message {i}", "destination_id": 1}
        resp = client.post("/api/v1/analyze/prompt", json=payload)
        
        if resp.status_code == 200:
            success_count += 1
        elif resp.status_code == 429:
            fail_count += 1
            if fail_count == 1:
                print(f"Got first 429! Headers: X-RateLimit-Limit={resp.headers.get('x-ratelimit-limit')}, X-RateLimit-Remaining={resp.headers.get('x-ratelimit-remaining')}")
        else:
            print(f"Unexpected status: {resp.status_code}")
            
    print(f"Passed: {success_count}, Rate Limited: {fail_count}")
    assert success_count <= 30
    assert fail_count >= 5
    print("SUCCESS: Rate limiter blocked excess requests.")

if __name__ == "__main__":
    setup_test_user()
    test_validation_error()
    test_idempotency_and_webhook()
    test_rate_limiting()
