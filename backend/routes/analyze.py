import hashlib
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.session import get_db
from database.models import User, Request as DBRequest, Finding as DBFinding, AuditLog
from security.dependencies import get_current_user
from backend.schemas.analyze import PromptAnalyzeRequest, AnalyzeResponse, FindingSchema
from ai_engine.detectors.presidio_pii import PresidioPIIDetector
from ai_engine.detectors.regex_secret import RegexSecretDetector
from policy_engine.evaluator import PolicyEvaluator

router = APIRouter()

# Instantiate detectors (in a real app, these might be dependencies or singletons)
pii_detector = PresidioPIIDetector()
secret_detector = RegexSecretDetector()

@router.post("/prompt", response_model=AnalyzeResponse)
def analyze_prompt(
    payload: PromptAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Normalization & Hashing
    prompt = payload.prompt
    raw_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()
    
    # 2. Detection (Deterministic Layer)
    findings = []
    findings.extend(pii_detector.analyze(prompt))
    findings.extend(secret_detector.analyze(prompt))
    
    # Calculate simple aggregate risk score (max confidence)
    risk_score = max([f["confidence"] for f in findings], default=0.0)

    # 3. Policy Evaluation
    evaluator = PolicyEvaluator(db)
    final_action = evaluator.evaluate(findings)

    # 4. Persistence
    # Create Request Record
    db_request = DBRequest(
        user_id=current_user.id,
        destination_id=payload.destination_id,
        request_hash=raw_hash,
        raw_content_hash=raw_hash,
        status="PROCESSED",
        final_action=final_action,
        risk_score=risk_score
    )
    db.add(db_request)
    db.flush() # To get the request_id
    
    # Create Finding Records
    response_findings = []
    for f in findings:
        db_finding = DBFinding(
            request_id=db_request.id,
            category=f["category"],
            confidence=f["confidence"],
            evidence=f["evidence"], # Already redacted by detectors
            detector_source=f["detector_source"]
        )
        db.add(db_finding)
        response_findings.append(FindingSchema(**f))
        
    # 5. Audit Logging
    audit_log = AuditLog(
        event_type=f"REQUEST_{final_action}",
        actor_id=current_user.id,
        target_id=str(db_request.id),
        meta_data={"risk_score": risk_score, "findings_count": len(findings)}
    )
    db.add(audit_log)
    
    db.commit()

    return AnalyzeResponse(
        request_id=db_request.id,
        final_action=final_action,
        risk_score=risk_score,
        findings=response_findings
    )
