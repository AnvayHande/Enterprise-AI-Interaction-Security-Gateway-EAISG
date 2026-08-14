import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)

class RiskAggregator:
    def __init__(self, boost_amount: float = 0.15, max_score: float = 1.0):
        self.boost_amount = boost_amount
        self.max_score = max_score

    def deduplicate_and_score(self, findings: List[Dict[str, Any]]) -> Tuple[float, Dict[str, Any]]:
        """
        Takes a raw list of findings, groups them by category, and applies an agreement boost.
        Returns the final computed risk_score and a breakdown dict for transparency.
        """
        if not findings:
            return 0.0, {"logic": "no_findings", "final_score": 0.0}

        # 1. Group by category
        categories: Dict[str, List[Dict[str, Any]]] = {}
        for f in findings:
            cat = f.get("category", "UNKNOWN")
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(f)

        breakdown = {
            "logic": "max_severity_with_agreement_boost",
            "categories": {},
            "final_score": 0.0,
            "driving_category": None
        }

        overall_max = 0.0
        driving_cat = None

        # 2. Score each category
        for cat, cats_findings in categories.items():
            # Get the single highest confidence for this category
            max_conf = max([f.get("confidence", 0.0) for f in cats_findings], default=0.0)
            
            # Count independent sources (deduplicate by detector_source)
            unique_sources = set([f.get("detector_source", "UNKNOWN") for f in cats_findings])
            
            # Boost logic: for every source beyond the first, add the boost_amount
            agreement_count = len(unique_sources) - 1
            boost = agreement_count * self.boost_amount
            
            adjusted_score = min(max_conf + boost, self.max_score)
            
            breakdown["categories"][cat] = {
                "base_confidence": max_conf,
                "independent_sources": list(unique_sources),
                "agreement_boost_applied": boost,
                "adjusted_score": adjusted_score
            }

            if adjusted_score > overall_max:
                overall_max = adjusted_score
                driving_cat = cat

        breakdown["final_score"] = overall_max
        breakdown["driving_category"] = driving_cat

        return overall_max, breakdown
