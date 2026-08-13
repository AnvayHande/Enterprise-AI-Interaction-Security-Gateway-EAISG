from typing import List, Dict, Any
from sqlalchemy.orm import Session
from database.models import Policy

class PolicyEvaluator:
    def __init__(self, db: Session):
        self.db = db
        
    def evaluate(self, findings: List[Dict[str, Any]]) -> str:
        # Default action
        final_action = "ALLOW"
        
        # Fetch enabled policies ordered by priority
        policies = self.db.query(Policy).filter(Policy.enabled == True).order_by(Policy.priority.desc()).all()
        
        if not policies:
            # Fallback policy if none defined in DB: Block any high confidence finding
            for finding in findings:
                if finding["confidence"] > 0.8:
                    return "BLOCK"
            return "ALLOW"

        # Evaluate against explicit policies
        for policy in policies:
            conditions = policy.conditions
            # Simplistic condition matcher for MVP:
            # If policy says {"category": "AWS_ACCESS_KEY"} and we have it, apply action
            for finding in findings:
                if "category" in conditions and finding["category"] == conditions["category"]:
                    # Check confidence threshold if specified
                    min_conf = conditions.get("min_confidence", 0.0)
                    if finding["confidence"] >= min_conf:
                        if policy.action == "BLOCK":
                            return "BLOCK" # Hard stop
                        elif policy.action == "WARN":
                            final_action = "WARN" # Can be overridden by a lower priority BLOCK

        return final_action
