import pytest
from ai_engine.aggregator import RiskAggregator

def test_empty_findings():
    agg = RiskAggregator()
    score, breakdown = agg.deduplicate_and_score([])
    assert score == 0.0
    assert breakdown["logic"] == "no_findings"

def test_single_finding():
    agg = RiskAggregator()
    findings = [{"category": "PII", "confidence": 0.8, "detector_source": "REGEX"}]
    score, breakdown = agg.deduplicate_and_score(findings)
    assert score == 0.8
    assert breakdown["driving_category"] == "PII"

def test_multiple_findings_same_source():
    agg = RiskAggregator()
    findings = [
        {"category": "PII", "confidence": 0.5, "detector_source": "REGEX"},
        {"category": "PII", "confidence": 0.8, "detector_source": "REGEX"}
    ]
    score, breakdown = agg.deduplicate_and_score(findings)
    assert score == 0.8
    assert breakdown["categories"]["PII"]["agreement_boost_applied"] == 0.0

def test_multiple_findings_different_sources():
    agg = RiskAggregator(boost_amount=0.1)
    findings = [
        {"category": "PII", "confidence": 0.6, "detector_source": "REGEX"},
        {"category": "PII", "confidence": 0.5, "detector_source": "PRESIDIO"}
    ]
    score, breakdown = agg.deduplicate_and_score(findings)
    assert score == pytest.approx(0.7)
    assert breakdown["categories"]["PII"]["agreement_boost_applied"] == 0.1

def test_max_score_cap():
    agg = RiskAggregator(boost_amount=0.5, max_score=1.0)
    findings = [
        {"category": "PII", "confidence": 0.8, "detector_source": "REGEX"},
        {"category": "PII", "confidence": 0.8, "detector_source": "PRESIDIO"}
    ]
    score, breakdown = agg.deduplicate_and_score(findings)
    assert score == 1.0

def test_multiple_categories():
    agg = RiskAggregator()
    findings = [
        {"category": "PII", "confidence": 0.5, "detector_source": "REGEX"},
        {"category": "CREDENTIAL", "confidence": 0.9, "detector_source": "REGEX"}
    ]
    score, breakdown = agg.deduplicate_and_score(findings)
    assert score == 0.9
    assert breakdown["driving_category"] == "CREDENTIAL"
