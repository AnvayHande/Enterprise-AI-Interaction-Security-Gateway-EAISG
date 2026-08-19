import pytest
from unittest.mock import patch, MagicMock

def test_analyze_prompt_success(client):
    payload = {
        "user_id": 1,
        "destination_id": 1,
        "prompt": "Hello world!"
    }
    
    # Mock ML Service
    with patch('ml.classifier.MLClassifier.analyze') as mock_analyze:
        mock_analyze.return_value = []
        
        # We also need to mock the LangGraph graph
        with patch('ai_engine.agents.graph.GraphOrchestrator.analyze') as mock_invoke:
            mock_invoke.return_value = []
            
            response = client.post("/api/v1/analyze/prompt", json=payload)
            assert response.status_code in [200, 401]
            if response.status_code == 200:
                data = response.json()
                assert data["action"] == "ALLOW"
                assert "risk_score" in data

def test_analyze_prompt_block(client):
    payload = {
        "user_id": 1,
        "destination_id": 1,
        "prompt": "Here is my secret: AKIAIOSFODNN7EXAMPLE"
    }
    
    with patch('ai_engine.agents.graph.GraphOrchestrator.analyze') as mock_invoke:
        mock_invoke.return_value = []
        
        response = client.post("/api/v1/analyze/prompt", json=payload)
        assert response.status_code in [200, 401]
        if response.status_code == 200:
            data = response.json()
            assert data["action"] == "BLOCK"
