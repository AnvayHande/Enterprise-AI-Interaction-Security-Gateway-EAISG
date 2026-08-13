from pydantic import BaseModel, Field
from typing import List, Optional

class PromptAnalyzeRequest(BaseModel):
    prompt: str
    destination_id: int

class FindingSchema(BaseModel):
    category: str
    confidence: float
    detector_source: str
    evidence: Optional[str] = None

class AnalyzeResponse(BaseModel):
    request_id: int
    final_action: str
    risk_score: float
    findings: List[FindingSchema]
