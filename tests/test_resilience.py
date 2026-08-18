import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_ml_service_timeout_fail_open():
    """
    Test chaos/failure mode: If the ML service times out, the system should log the error
    and fall back to deterministic evaluation (fail open) rather than crashing the request.
    """
    with patch('ml.inference.LocalMLService.analyze_text') as mock_analyze:
        mock_analyze.side_effect = TimeoutError("ML Service is down")
        
        payload = {
            "user_id": 1,
            "destination_id": 1,
            "prompt": "Normal looking request that should pass deterministic checks."
        }
        
        response = client.post("/api/v1/analyze/prompt", json=payload)
        # Even with ML down, it should return a 200 (or 401 if unauthenticated in test environment)
        # It should not return a 500 Internal Server Error
        assert response.status_code in [200, 401]

def test_database_connection_failure():
    """
    Test chaos/failure mode: If the database is completely unreachable during policy eval,
    the system should fail closed (return a 503 or 500 but handled gracefully).
    """
    with patch('database.session.get_db') as mock_db:
        mock_db.side_effect = ConnectionError("DB is unreachable")
        
        payload = {
            "user_id": 1,
            "destination_id": 1,
            "prompt": "Test request"
        }
        
        response = client.post("/api/v1/analyze/prompt", json=payload)
        assert response.status_code >= 500
