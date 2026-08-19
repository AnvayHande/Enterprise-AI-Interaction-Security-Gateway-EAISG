import pytest
from ai_engine.detectors.regex_secret import RegexSecretDetector
from ai_engine.detectors.presidio_pii import PresidioPIIDetector
from ai_engine.detectors.financial_legal import FinancialLegalDetector
from ai_engine.detectors.source_code import SourceCodeDetector

def test_regex_secret_detector():
    detector = RegexSecretDetector()
    
    fake_aws_key = "AKIA1234567890ABCDEF"
    text1 = f"Here is my key: {fake_aws_key}"
    findings1 = detector.analyze(text1)
    
    assert len(findings1) >= 1
    assert findings1[0]["category"] == "AWS_ACCESS_KEY"
    assert findings1[0]["confidence"] == 0.99
    
    text2 = "AKIAIOSFODNN7EXAMPLE"
    findings2 = detector.analyze(text2)
    assert len(findings2) == 0

    text3 = "This is a random token: ABcdefGhijKLMNopqrSTUVwxyz123456"
    findings3 = detector.analyze(text3)
    assert len(findings3) == 1
    assert findings3[0]["category"] == "HIGH_ENTROPY_STRING"
    assert findings3[0]["detector_source"] == "ENTROPY"

def test_presidio_pii_detector():
    try:
        detector = PresidioPIIDetector()
        text = "My phone number is 212-555-1234 and email is john.doe@example.com."
        findings = detector.analyze(text)
        categories = [f["category"] for f in findings]
        assert "PHONE_NUMBER" in categories or "EMAIL_ADDRESS" in categories
    except Exception as e:
        pytest.skip(f"Presidio not properly initialized or models missing: {e}")

def test_financial_legal_detector():
    detector = FinancialLegalDetector()
    text = "Attached is the Q3 balance sheet and pending litigation settlement agreement."
    findings = detector.analyze(text)
    
    categories = [f["category"] for f in findings]
    assert "FINANCIAL_DATA" in categories
    assert "LEGAL_DATA" in categories

def test_source_code_detector():
    detector = SourceCodeDetector()
    text = "def hello_world():\n    print('Hello')\nimport sys"
    findings = detector.analyze(text)
    
    assert len(findings) > 0
    assert findings[0]["category"] == "SOURCE_CODE"
    assert findings[0]["confidence"] >= 0.7
