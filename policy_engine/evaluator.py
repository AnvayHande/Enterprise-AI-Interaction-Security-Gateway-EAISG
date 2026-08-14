from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from database.models import Policy, User

class PolicyEvaluator:
    def __init__(self, db: Session):
        self.db = db
        
    def _get_default_action(self, risk_score: float) -> str:
        if risk_score > 0.8:
            return "BLOCK"
        elif risk_score > 0.4:
            return "WARN"
        return "ALLOW"

    def evaluate(self, findings: List[Dict[str, Any]], risk_score: float, user: User) -> str:
        # 14.4 Default Behavior When No Policy Matches
        final_action = self._get_default_action(risk_score)
        
        # Fetch enabled policies ordered by priority
        policies = self.db.query(Policy).filter(Policy.enabled == True).order_by(Policy.priority.desc()).all()
        
        if not policies:
            return final_action

        # Evaluate against explicit policies
        for policy in policies:
            conditions = policy.conditions
            
            # 14.5 Department- and Role-Sensitive Policy Authoring
            req_role = conditions.get("role")
            if req_role and user.role != req_role:
                continue # Skip policy if role doesn't match
                
            req_dept = conditions.get("department_id")
            if req_dept and user.department_id != req_dept:
                continue # Skip policy if department doesn't match

            # Simplistic condition matcher for MVP:
            # If policy says {"category": "AWS_ACCESS_KEY"} and we have it, apply action
            match_found = False
            for finding in findings:
                if "category" in conditions and finding["category"] == conditions["category"]:
                    # Check confidence threshold if specified
                    min_conf = conditions.get("min_confidence", 0.0)
                    if finding["confidence"] >= min_conf:
                        match_found = True
                        break # One finding is enough to trigger the policy
            
            if match_found:
                if policy.action == "BLOCK":
                    return "BLOCK" # Hard stop, highest priority wins
                elif policy.action == "WARN":
                    # If it's a WARN, we set final_action and keep evaluating lower-priority policies
                    # because a lower priority policy might say BLOCK.
                    # Actually, if we want strict priority: a high-priority WARN shouldn't be overridden by a low-priority BLOCK? 
                    # Wait, usually high priority wins entirely. Let's return WARN immediately if it's highest priority.
                    # But the previous implementation allowed override. Let's just return immediately for MVP simplicity.
                    return "WARN"
                elif policy.action == "ALLOW":
                    return "ALLOW"

        return final_action

