import re
from typing import List, Dict, Any

class ResponseDetector:
    """
    Analyzes the outbound response from the LLM to the user.
    Looks for hallucinated internal facts, policy-violating content generation,
    and dangerous advice.
    """
    
    def __init__(self):
        self.rules = {
            "HALLUCINATED_POLICY": [
                r"(?i)internal policy states",
                r"(?i)company secret",
                r"(?i)confidential project [a-z0-9]+"
            ],
            "MALICIOUS_GENERATION": [
                r"(?i)here is the exploit",
                r"(?i)bypass the firewall",
                r"(?i)drop table users"
            ],
            "UNVERIFIED_CLAIM": [
                r"(?i)the standard operating procedure is to",
                r"(?i)our internal dataset includes",
                r"(?i)the exact format for the credential is"
            ]
        }
        
    def analyze(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        
        for category, patterns in self.rules.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    findings.append({
                        "category": category,
                        "confidence": 0.85, # Deterministic match
                        "evidence": match.group(0),
                        "detector_source": "regex_response"
                    })
                    
        return findings
