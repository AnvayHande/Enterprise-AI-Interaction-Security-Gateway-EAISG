import re
from typing import List, Dict, Any

class SourceCodeDetector:
    def __init__(self):
        # Very basic heuristics for the MVP
        self.code_keywords = [
            r"\bdef\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\(",
            r"\bclass\s+[a-zA-Z_][a-zA-Z0-9_]*\s*:",
            r"\bimport\s+[a-zA-Z0-9_\.]+",
            r"\bfrom\s+[a-zA-Z0-9_\.]+\s+import\s+",
            r"\bpublic\s+class\s+[a-zA-Z_]",
            r"\bSystem\.out\.println",
            r"\bconsole\.log\s*\(",
            r"\bconst\s+[a-zA-Z_]+\s*=\s*",
            r"\bfunction\s+[a-zA-Z_]+\s*\(",
            r"\bvar\s+[a-zA-Z_]+\s*="
        ]
        
    def analyze(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        match_count = 0
        matched_patterns = []
        
        for pattern in self.code_keywords:
            matches = re.finditer(pattern, text)
            for match in matches:
                match_count += 1
                matched_patterns.append(match.group(0))
                if match_count >= 3:
                    break
            if match_count >= 3:
                break
                
        if match_count > 0:
            # Confidence tiered: 1 match = low, 2 = med, 3+ = high
            confidence = 0.5 if match_count == 1 else 0.7 if match_count == 2 else 0.95
            
            findings.append({
                "category": "SOURCE_CODE",
                "confidence": confidence,
                "detector_source": "HEURISTIC",
                "evidence": f"Matched patterns: {', '.join(matched_patterns[:3])}"
            })
            
        return findings
