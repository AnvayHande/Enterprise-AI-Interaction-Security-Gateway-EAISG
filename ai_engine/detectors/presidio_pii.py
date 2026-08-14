from presidio_analyzer import AnalyzerEngine, RecognizerRegistry, PatternRecognizer, Pattern
from typing import List, Dict, Any

class PresidioPIIDetector:
    def __init__(self, locales: List[str] = ["en"]):
        self.locales = locales
        
        # Setting up the analyzer engine
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers()
        
        # Example: Add custom context for US_SSN
        ssn_recognizer = registry.get_recognizers(language="en", entities=["US_SSN"])
        if ssn_recognizer:
            ssn_recognizer[0].context = ["social security", "ssn", "social"]
            
        self.analyzer = AnalyzerEngine(registry=registry)
        
    def analyze(self, text: str) -> List[Dict[str, Any]]:
        findings = []
        for locale in self.locales:
            results = self.analyzer.analyze(text=text, language=locale)
            for result in results:
                findings.append({
                    "category": f"PII_{result.entity_type}",
                    "confidence": result.score,
                    "detector_source": "PRESIDIO",
                    "evidence": text[result.start:result.end],
                    "start_idx": result.start,
                    "end_idx": result.end
                })
        return findings
