from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PromptAnalyzeRequest(BaseModel):
    prompt: str
    destination_id: int

class FindingSchema(BaseModel):
    category: str
    confidence: float
    detector_source: str
    evidence: Optional[str] = None
    start_idx: Optional[int] = None
    end_idx: Optional[int] = None

class AnalyzeResponse(BaseModel):
    request_id: int
    final_action: str
    risk_score: float
    findings: List[FindingSchema]
    aggregation_breakdown: Optional[Dict[str, Any]] = None
    sanitized_content: Optional[str] = None
    provider_response: Optional[str] = None
    provider_used: Optional[int] = None
    response_findings: Optional[List[FindingSchema]] = []
    response_action: Optional[str] = None
