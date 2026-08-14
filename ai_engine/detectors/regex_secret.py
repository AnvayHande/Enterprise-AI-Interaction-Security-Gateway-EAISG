import re
import math
from typing import List, Dict, Any

class RegexSecretDetector:
    def __init__(self):
        # Expanded set of patterns based on detect-secrets/gitleaks
        self.patterns = {
            "AWS_ACCESS_KEY": r"(?i)(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
            "AWS_SECRET_KEY": r"(?i)(?:aws_secret|aws_secret_access_key|secret_key).{0,20}['\"][0-9a-zA-Z\/+]{40}['\"]",
            "GENERIC_BEARER_TOKEN": r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}",
            "PRIVATE_KEY_HEADER": r"-----BEGIN (RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----",
            "GITHUB_TOKEN": r"(?i)gh[p|u|s|r]_[A-Za-z0-9_]{36}",
            "SLACK_TOKEN": r"xox[baprs]-[0-9]{10,13}-[a-zA-Z0-9]{24}"
        }
        
        # Explicit allowlist for known-safe placeholders
        self.allowlist = [
            "your_api_key_here",
            "example_token",
            "AKIAIOSFODNN7EXAMPLE", # AWS documented example key
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        ]
        
    def _shannon_entropy(self, data: str) -> float:
        if not data:
            return 0
        entropy = 0
        for x in set(data):
            p_x = float(data.count(x))/len(data)
            entropy += - p_x * math.log2(p_x)
        return entropy

    def _is_allowlisted(self, evidence: str) -> bool:
        for allowed in self.allowlist:
            if allowed.lower() in evidence.lower():
                return True
        return False
        
    def _validate_aws_key(self, key: str) -> bool:
        # Simple heuristic: AWS access keys are usually 20 chars
        return len(key) == 20

    def analyze(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        
        # 1. Regex Matching
        for category, pattern in self.patterns.items():
            for match in re.finditer(pattern, text):
                evidence = match.group(0)
                if self._is_allowlisted(evidence):
                    continue
                    
                if category == "AWS_ACCESS_KEY" and not self._validate_aws_key(evidence.strip()):
                    continue

                findings.append({
                    "category": category,
                    "confidence": 0.99, # Regex matches are usually high confidence
                    "detector_source": "REGEX",
                    "evidence": evidence[:5] + "...", # Redact the actual secret
                    "start_idx": match.start(),
                    "end_idx": match.end()
                })
                
        # 2. Entropy Check
        for match in re.finditer(r'\b[a-zA-Z0-9_\-]{20,}\b', text):
            word = match.group(0)
            if self._is_allowlisted(word):
                continue
                
            # High entropy strings > 4.5 bits/char are often random tokens/secrets
            if self._shannon_entropy(word) > 4.5:
                # To prevent double counting if regex already caught it
                if not any(f["evidence"].startswith(word[:5]) for f in findings):
                    findings.append({
                        "category": "HIGH_ENTROPY_STRING",
                        "confidence": 0.8,
                        "detector_source": "ENTROPY",
                        "evidence": word[:5] + "...",
                        "start_idx": match.start(),
                        "end_idx": match.end()
                    })
                    
        return findings
