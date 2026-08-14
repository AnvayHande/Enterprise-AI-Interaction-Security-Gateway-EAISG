import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_engine.detectors.presidio_pii import PresidioPIIDetector
from ai_engine.detectors.regex_secret import RegexSecretDetector
from ai_engine.sanitizer import Sanitizer

def test_sanitization():
    print("Testing Inline Sanitization...")
    text = "Here is my AWS key: AKIA1234567890ABCDEF and my SSN is 123-45-6789. Don't share it!"
    
    # 1. Detection
    pii_detector = PresidioPIIDetector()
    secret_detector = RegexSecretDetector()
    
    findings = []
    findings.extend(pii_detector.analyze(text))
    findings.extend(secret_detector.analyze(text))
    
    print(f"Original Text: {text}")
    print(f"Found {len(findings)} sensitive items.")
    for f in findings:
        print(f" - {f['category']} at [{f.get('start_idx')}:{f.get('end_idx')}]")
        
    # 2. Sanitization
    sanitizer = Sanitizer()
    sanitized_text = sanitizer.redact_text(text, findings)
    
    print(f"Sanitized Text: {sanitized_text}")
    
    # 3. Verification Loop
    new_findings = []
    new_findings.extend(pii_detector.analyze(sanitized_text))
    new_findings.extend(secret_detector.analyze(sanitized_text))
    
    print(f"Verification: Found {len(new_findings)} items in sanitized text.")
    if len(new_findings) == 0:
        print("SUCCESS: Sanitization worked perfectly.")
    else:
        print("FAILED: Sanitization leaked data.")
        
if __name__ == "__main__":
    test_sanitization()
