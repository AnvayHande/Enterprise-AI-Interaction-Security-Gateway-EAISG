import pytest
from unittest.mock import MagicMock
from policy_engine.evaluator import PolicyEvaluator
from database.models import Policy, User

def test_policy_evaluator_block():
    mock_db = MagicMock()
    # Setup mock query to return our policy
    mock_policy = Policy(
        id=1,
        name="Block High Confidence PII",
        priority=10,
        enabled=True,
        action="BLOCK",
        conditions={"category": "PII", "min_confidence": 0.9}
    )
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_order = mock_filter.order_by.return_value
    mock_order.all.return_value = [mock_policy]

    evaluator = PolicyEvaluator(db=mock_db)
    
    findings = [
        {"category": "PII", "confidence": 0.95, "detector_source": "regex", "evidence": "***"}
    ]
    
    user = User(id=1, email="test@example.com", role="USER")
    
    result = evaluator.evaluate(findings, risk_score=0.2, user=user)
    
    assert result == "BLOCK"

def test_policy_evaluator_no_match():
    mock_db = MagicMock()
    mock_policy = Policy(
        id=1,
        name="Block High Confidence PII",
        priority=10,
        enabled=True,
        action="BLOCK",
        conditions={"category": "PII", "min_confidence": 0.9}
    )
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_order = mock_filter.order_by.return_value
    mock_order.all.return_value = [mock_policy]

    evaluator = PolicyEvaluator(db=mock_db)
    
    findings = [
        # Confidence is below threshold
        {"category": "PII", "confidence": 0.5, "detector_source": "regex", "evidence": "***"}
    ]
    
    user = User(id=1, email="test@example.com", role="USER")
    
    result = evaluator.evaluate(findings, risk_score=0.2, user=user)
    
    # Should fall back to default action for low risk score (ALLOW)
    assert result == "ALLOW"
