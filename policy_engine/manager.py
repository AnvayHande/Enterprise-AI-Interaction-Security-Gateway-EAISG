from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database.models import Policy, PolicyVersion, Request, Finding
from policy_engine.evaluator import PolicyEvaluator

class PolicyConflictError(Exception):
    pass

class PolicyManager:
    def __init__(self, db: Session):
        self.db = db

    def check_conflicts(self, conditions: Dict[str, Any], action: str, priority: int, exclude_policy_id: Optional[int] = None) -> List[str]:
        """
        Check if the proposed policy contradicts or is rendered unreachable by existing active policies.
        Returns a list of conflict warning messages.
        """
        conflicts = []
        # Get all active policies
        query = self.db.query(Policy).filter(Policy.enabled == True)
        if exclude_policy_id:
            query = query.filter(Policy.id != exclude_policy_id)
            
        existing_policies = query.order_by(Policy.priority.desc()).all()

        for ep in existing_policies:
            # Check for exact condition match but different action
            if ep.conditions == conditions:
                if ep.action != action:
                    conflicts.append(
                        f"Direct contradiction with Policy '{ep.name}' (ID {ep.id}): "
                        f"Same conditions but action is {ep.action}."
                    )
                else:
                    conflicts.append(
                        f"Redundant policy: Policy '{ep.name}' (ID {ep.id}) already exists "
                        f"with the exact same conditions and action."
                    )

            # Check for subset conditions (unreachable policies)
            # A simplistic check: if all keys/values in EP are in conditions, EP is broader.
            # If EP has higher priority, the new policy is unreachable.
            if ep.priority > priority:
                is_subset = True
                for k, v in ep.conditions.items():
                    if conditions.get(k) != v:
                        is_subset = False
                        break
                
                if is_subset and ep.conditions != conditions:
                    conflicts.append(
                        f"Unreachable policy: Existing higher-priority policy '{ep.name}' (ID {ep.id}) "
                        f"is broader and will trigger first."
                    )

        return conflicts

    def create_policy(self, name: str, conditions: Dict[str, Any], action: str, priority: int, changed_by_user_id: int, description: str = "") -> Policy:
        conflicts = self.check_conflicts(conditions, action, priority)
        if conflicts:
            raise PolicyConflictError(" | ".join(conflicts))

        new_policy = Policy(
            name=name,
            description=description,
            priority=priority,
            conditions=conditions,
            action=action,
            enabled=True
        )
        self.db.add(new_policy)
        self.db.flush() # get ID

        version = PolicyVersion(
            policy_id=new_policy.id,
            conditions=conditions,
            action=action,
            changed_by=changed_by_user_id
        )
        self.db.add(version)
        self.db.commit()
        return new_policy

    def simulate(self, conditions: Dict[str, Any], action: str, lookback_days: int = 7) -> Dict[str, Any]:
        """
        Simulate how a hypothetical policy would have affected historical traffic.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)
        
        # Get historical requests
        historical_requests = self.db.query(Request).filter(Request.created_at >= cutoff_date).all()
        
        simulation_results = {
            "total_requests_evaluated": len(historical_requests),
            "would_change_to_allow": 0,
            "would_change_to_warn": 0,
            "would_change_to_block": 0,
            "unchanged": 0,
            "affected_request_ids": []
        }

        # Create a mock Policy object to pass to a modified evaluator
        mock_policy = Policy(id=-1, name="SIMULATION", priority=999, conditions=conditions, action=action, enabled=True)
        
        for req in historical_requests:
            # We need findings as Dicts
            findings_dicts = [{"category": f.category, "confidence": f.confidence} for f in req.findings]
            
            # Simple simulation logic (MVP): Does the mock policy match this request?
            match_found = False
            
            # Check user role / department constraints if any
            req_role = conditions.get("role")
            if req_role and req.user.role != req_role:
                continue
                
            req_dept = conditions.get("department_id")
            if req_dept and req.user.department_id != req_dept:
                continue

            for f in findings_dicts:
                if "category" in conditions and f["category"] == conditions["category"]:
                    if f["confidence"] >= conditions.get("min_confidence", 0.0):
                        match_found = True
                        break
            
            if match_found:
                new_action = action
                if new_action != req.final_action:
                    simulation_results[f"would_change_to_{new_action.lower()}"] += 1
                    simulation_results["affected_request_ids"].append(req.id)
                else:
                    simulation_results["unchanged"] += 1
            else:
                simulation_results["unchanged"] += 1

        return simulation_results
