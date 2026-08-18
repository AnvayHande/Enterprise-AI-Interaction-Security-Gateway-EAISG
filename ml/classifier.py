import os
import joblib
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class MLClassifier:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), 'models', 'baseline_model.joblib')
        self.pipeline = None
        self.is_available = False
        
        if os.path.exists(self.model_path):
            try:
                self.pipeline = joblib.load(self.model_path)
                self.is_available = True
                self.classes = self.pipeline.classes_
            except Exception as e:
                logger.error(f"Failed to load ML model: {e}")
        else:
            logger.warning(f"ML model not found at {self.model_path}. Run ml/train.py first.")

    from core.cache import cached

    @cached("ml_classifier")
    def analyze(self, text: str) -> List[Dict[str, Any]]:
        if not self.is_available or not text.strip():
            return []
            
        findings = []
        try:
            # Predict probabilities
            probs = self.pipeline.predict_proba([text])[0]
            
            # Find the class with the highest probability
            max_prob_idx = probs.argmax()
            predicted_class = self.classes[max_prob_idx]
            confidence = probs[max_prob_idx]
            
            # Only report if it's not SAFE and confidence is reasonably high (> 0.6)
            if predicted_class != "SAFE" and confidence > 0.6:
                findings.append({
                    "category": predicted_class, # Maps to FINANCIAL, LEGAL, etc.
                    "confidence": float(confidence),
                    "detector_source": "ML_BASELINE",
                    "evidence": text[:100] + "..." if len(text) > 100 else text
                })
        except Exception as e:
            logger.error(f"Error during ML prediction: {e}")
            
        return findings
