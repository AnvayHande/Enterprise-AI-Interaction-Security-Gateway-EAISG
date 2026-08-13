import re
import math
from typing import List, Dict, Any

class RegexSecretDetector:
    def __init__(self):
        # A minimal set of patterns for the MVP
        self.patterns = {
            "AWS_ACCESS_KEY": r"(?i)AKIA[0-9A-Z]{16}",
            "GENERIC_BEARER_TOKEN": r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}",
            "PRIVATE_KEY_HEADER": r"-----BEGIN (RSA|OPENSSH|DSA|EC) PRIVATE KEY-----"
        }
        
    def _shannon_entropy(self, data: str) -> float:
        if not data:
            return 0
        entropy = 0
        for x in set(data):
            p_x = float(data.count(x))/len(data)
            entropy += - p_x * math.log2(p_x)
        return entropy

    def analyze(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        
        # 1. Regex Matching
        for category, pattern in self.patterns.items():
            for match in re.finditer(pattern, text):
                findings.append({
                    "category": category,
                    "confidence": 0.99, # Regex matches are usually high confidence
                    "detector_source": "REGEX",
                    "evidence": match.group(0)[:5] + "..." # Redact the actual secret
                })
                
        # 2. Entropy Check (simplified for MVP: checking long words)
        words = re.findall(r'\b[a-zA-Z0-9_\-]{20,}\b', text)
        for word in words:
            # High entropy strings > 4.5 bits/char are often random tokens/secrets
            if self._shannon_entropy(word) > 4.5:
                # To prevent double counting if regex already caught it
                if not any(f["evidence"].startswith(word[:5]) for f in findings):
                    findings.append({
                        "category": "HIGH_ENTROPY_STRING",
                        "confidence": 0.8,
                        "detector_source": "ENTROPY",
                        "evidence": word[:5] + "..."
                    })
                    
        return findings
