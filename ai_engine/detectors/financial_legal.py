import re
from typing import List, Dict, Any

class FinancialLegalDetector:
    def __init__(self):
        self.financial_keywords = [
            r"\bEBITDA\b",
            r"\bquarterly earnings\b",
            r"\bbalance sheet\b",
            r"\bcash flow statement\b",
            r"\bwire transfer\b",
            r"\brouting number\b",
            r"\baccount number\b",
            r"\bprofit margin\b",
            r"\bM&A\b",
            r"\bmerger\b"
        ]
        
        self.legal_keywords = [
            r"\bconfidential\b",
            r"\bnondisclosure\b",
            r"\bNDA\b",
            r"\blawsuit\b",
            r"\bsubpoena\b",
            r"\bsettlement agreement\b",
            r"\bintellectual property\b",
            r"\btrade secret\b",
            r"\bpatent pending\b",
            r"\bprivileged and confidential\b"
        ]
        
    def analyze(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        
        # Financial
        fin_matches = []
        for pattern in self.financial_keywords:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                fin_matches.append(match.group(0))
                
        if fin_matches:
            confidence = min(0.95, 0.5 + 0.1 * len(fin_matches))
            findings.append({
                "category": "FINANCIAL_DATA",
                "confidence": confidence,
                "detector_source": "KEYWORD",
                "evidence": f"Matched keywords: {', '.join(fin_matches[:3])}"
            })
            
        # Legal
        leg_matches = []
        for pattern in self.legal_keywords:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                leg_matches.append(match.group(0))
                
        if leg_matches:
            confidence = min(0.95, 0.5 + 0.1 * len(leg_matches))
            findings.append({
                "category": "LEGAL_DATA",
                "confidence": confidence,
                "detector_source": "KEYWORD",
                "evidence": f"Matched keywords: {', '.join(leg_matches[:3])}"
            })
            
        return findings
