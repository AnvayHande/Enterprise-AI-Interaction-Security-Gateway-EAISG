import hashlib
from fastapi import APIRouter, Depends, File, UploadFile, Form, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone

from database.session import get_db
from database.models import User, Request as DBRequest, Finding as DBFinding, AuditLog
from security.dependencies import get_current_user
from backend.schemas.analyze import PromptAnalyzeRequest, AnalyzeResponse, FindingSchema
from backend.middleware.rate_limiter import rate_limit

# Detectors
from ai_engine.detectors.presidio_pii import PresidioPIIDetector
from ai_engine.detectors.regex_secret import RegexSecretDetector
from ai_engine.detectors.source_code import SourceCodeDetector
from ai_engine.detectors.financial_legal import FinancialLegalDetector
from ai_engine.detectors.response_detector import ResponseDetector

# ML Model
from ml.classifier import MLClassifier

from policy_engine.evaluator import PolicyEvaluator
from file_processor.pipeline import FileProcessingPipeline

# Agents
from ai_engine.agents.graph import GraphOrchestrator
from ai_engine.aggregator import RiskAggregator
from ai_engine.sanitizer import Sanitizer

router = APIRouter()

# Instantiate detectors (in a real app, these might be dependencies or singletons)
pii_detector = PresidioPIIDetector()
secret_detector = RegexSecretDetector()
source_code_detector = SourceCodeDetector()
financial_legal_detector = FinancialLegalDetector()
ml_classifier = MLClassifier()
graph_orchestrator = GraphOrchestrator()
risk_aggregator = RiskAggregator()
sanitizer = Sanitizer()
response_detector = ResponseDetector()

@router.post("/prompt", response_model=AnalyzeResponse)
@rate_limit(requests_per_minute=30)
def analyze_prompt(
    payload: PromptAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Normalization & Hashing
    prompt = payload.prompt
    raw_hash = hashlib.sha256(prompt.encode('utf-8')).hexdigest()
    
    # 1.5 Idempotency & Deduplication
    five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    cached_request = db.query(DBRequest).filter(
        DBRequest.user_id == current_user.id,
        DBRequest.raw_content_hash == raw_hash,
        DBRequest.created_at >= five_mins_ago,
        DBRequest.status == "PROCESSED"
    ).order_by(desc(DBRequest.created_at)).first()

    if cached_request:
        cached_findings = db.query(DBFinding).filter(DBFinding.request_id == cached_request.id).all()
        response_findings = [FindingSchema(
            category=f.category, confidence=f.confidence, evidence=f.evidence, detector_source=f.detector_source
        ) for f in cached_findings]
        
        return AnalyzeResponse(
            request_id=cached_request.id,
            final_action=cached_request.final_action,
            risk_score=cached_request.risk_score,
            findings=response_findings,
            sanitized_content=None,
            provider_response="[CACHED RESPONSE]",
            provider_used=cached_request.destination_id
        )

    # 2. Detection (Deterministic Layer + ML Layer)
    findings = []
    findings.extend(pii_detector.analyze(prompt))
    findings.extend(secret_detector.analyze(prompt))
    findings.extend(source_code_detector.analyze(prompt))
    findings.extend(financial_legal_detector.analyze(prompt))
    
    # ML Classification
    findings.extend(ml_classifier.analyze(prompt))
    
    # Calculate aggregate risk score using RiskAggregator (Phase 10)
    risk_score, aggregation_breakdown = risk_aggregator.deduplicate_and_score(findings)

    # 2.5 LangGraph Confidence Gating (Phase 9)
    # Only invoke LLM reasoning if the deterministic/ML confidence is in the gray area
    if 0.4 <= risk_score <= 0.8:
        agent_findings = graph_orchestrator.analyze(prompt)
        findings.extend(agent_findings)
        # Recalculate risk score and breakdown
        risk_score, aggregation_breakdown = risk_aggregator.deduplicate_and_score(findings)

    # 3. Policy Evaluation
    evaluator = PolicyEvaluator(db)
    final_action = evaluator.evaluate(findings, risk_score, current_user)
    
    sanitized_content = None

    # 3.5 Sanitization & Verification Loop (Phase 12)
    text_to_route = prompt
    if final_action == "SANITIZE":
        sanitized_content = sanitizer.redact_text(prompt, findings)
        text_to_route = sanitized_content
        
        # Verify sanitization worked
        new_findings = []
        new_findings.extend(pii_detector.analyze(sanitized_content))
        new_findings.extend(secret_detector.analyze(sanitized_content))
        new_findings.extend(source_code_detector.analyze(sanitized_content))
        new_findings.extend(financial_legal_detector.analyze(sanitized_content))
        new_findings.extend(ml_classifier.analyze(sanitized_content))
        
        new_risk_score, _ = risk_aggregator.deduplicate_and_score(new_findings)
        if new_risk_score > 0.8: # If still highly risky, escalate
            final_action = "BLOCK"

    provider_response = None
    provider_used = None
    response_findings_api = []
    response_action = None

    # 3.6 Route to AI Provider (Phase 13)
    if final_action in ["ALLOW", "SANITIZE"] and text_to_route:
        from ai_engine.router import RoutingManager
        router_mgr = RoutingManager(db)
        try:
            provider_response, provider_used = router_mgr.route_request(payload.destination_id, text_to_route)
        except Exception as e:
            final_action = "FAILED"
            provider_response = f"Routing failed: {str(e)}"

    # 3.7 Response Analysis (Phase 15)
    if provider_response and final_action != "FAILED":
        resp_finds = response_detector.analyze(provider_response)
        if resp_finds:
            resp_risk_score, _ = risk_aggregator.deduplicate_and_score(resp_finds)
            response_action = evaluator.evaluate(resp_finds, resp_risk_score, current_user)
            for f in resp_finds:
                f_out = f.copy()
                if "start_idx" in f_out: del f_out["start_idx"]
                if "end_idx" in f_out: del f_out["end_idx"]
                response_findings_api.append(FindingSchema(**f_out))
            if response_action == "BLOCK":
                provider_response = "[BLOCKED BY RESPONSE ANALYZER]"

    # 4. Persistence
    db_request = DBRequest(
        user_id=current_user.id,
        destination_id=provider_used if provider_used else payload.destination_id,
        request_hash=raw_hash,
        raw_content_hash=raw_hash,
        status="PROCESSED" if final_action != "FAILED" else "FAILED",
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
        
        # For the API response, exclude indices as they are internal details
        f_out = f.copy()
        if "start_idx" in f_out: del f_out["start_idx"]
        if "end_idx" in f_out: del f_out["end_idx"]
        response_findings.append(FindingSchema(**f_out))
        
    # 5. Audit Logging
    audit_log = AuditLog(
        event_type=f"REQUEST_{final_action}",
        actor_id=current_user.id,
        target_id=str(db_request.id),
        meta_data={
            "request_id": db_request.id,
            "user_id": current_user.id,
            "risk_score": risk_score, 
            "findings_count": len(findings),
            "aggregation_breakdown": aggregation_breakdown,
            "was_sanitized": final_action == "SANITIZE" or sanitized_content is not None,
            "provider_used": provider_used,
            "routing_failed": final_action == "FAILED",
            "response_action": response_action,
            "response_findings_count": len(response_findings_api)
        }
    )
    db.add(audit_log)
    db.commit()

    # 5.5 Webhook Alerts (Phase 14)
    if final_action == "BLOCK" and risk_score >= 0.8:
        from backend.services.webhook import WebhookDispatcher
        webhook = WebhookDispatcher()
        webhook.dispatch_critical_alert(
            event_type="CRITICAL_BLOCK",
            request_id=db_request.id,
            user_id=current_user.id,
            details={
                "risk_score": risk_score,
                "findings": [f["category"] for f in findings]
            }
        )

    return AnalyzeResponse(
        request_id=db_request.id,
        final_action=final_action,
        risk_score=risk_score,
        findings=response_findings,
        aggregation_breakdown=aggregation_breakdown,
        sanitized_content=sanitized_content,
        provider_response=provider_response,
        provider_used=provider_used,
        response_findings=response_findings_api,
        response_action=response_action
    )

@router.post("/file", response_model=AnalyzeResponse)
@rate_limit(requests_per_minute=30)
async def analyze_file(
    file: UploadFile = File(...),
    destination_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_content = await file.read()
    filename = file.filename
    
    # 1. Pipeline Processing
    pipeline = FileProcessingPipeline()
    extracted_text, file_hash, mime_type = pipeline.process(file_content, filename)
    
    # 1.5 Idempotency & Deduplication
    five_mins_ago = datetime.now(timezone.utc) - timedelta(minutes=5)
    cached_request = db.query(DBRequest).filter(
        DBRequest.user_id == current_user.id,
        DBRequest.raw_content_hash == file_hash,
        DBRequest.created_at >= five_mins_ago,
        DBRequest.status == "PROCESSED"
    ).order_by(desc(DBRequest.created_at)).first()

    if cached_request:
        cached_findings = db.query(DBFinding).filter(DBFinding.request_id == cached_request.id).all()
        response_findings = [FindingSchema(
            category=f.category, confidence=f.confidence, evidence=f.evidence, detector_source=f.detector_source
        ) for f in cached_findings]
        
        return AnalyzeResponse(
            request_id=cached_request.id,
            final_action=cached_request.final_action,
            risk_score=cached_request.risk_score,
            findings=response_findings,
            sanitized_content=None,
            provider_response="[CACHED RESPONSE]",
            provider_used=cached_request.destination_id
        )

    # 2. Detection (Deterministic Layer + ML Layer)
    findings = []
    if extracted_text:
        findings.extend(pii_detector.analyze(extracted_text))
        findings.extend(secret_detector.analyze(extracted_text))
        findings.extend(source_code_detector.analyze(extracted_text))
        findings.extend(financial_legal_detector.analyze(extracted_text))
        
        # ML Classification
        findings.extend(ml_classifier.analyze(extracted_text))
        
    # Calculate aggregate risk score using RiskAggregator (Phase 10)
    risk_score, aggregation_breakdown = risk_aggregator.deduplicate_and_score(findings)

    # 2.5 LangGraph Confidence Gating (Phase 9)
    # Only invoke LLM reasoning if the deterministic/ML confidence is in the gray area
    if 0.4 <= risk_score <= 0.8 and extracted_text:
        agent_findings = graph_orchestrator.analyze(extracted_text)
        findings.extend(agent_findings)
        # Recalculate risk score
        risk_score, aggregation_breakdown = risk_aggregator.deduplicate_and_score(findings)

    # 3. Policy Evaluation
    evaluator = PolicyEvaluator(db)
    final_action = evaluator.evaluate(findings, risk_score, current_user)
    
    sanitized_content = None
    provider_response = None
    provider_used = None

    # 3.5 Sanitization & Verification Loop (Phase 12)
    text_to_route = extracted_text
    if final_action == "SANITIZE" and extracted_text:
        sanitized_content = sanitizer.redact_text(extracted_text, findings)
        text_to_route = sanitized_content
        
        # Verify sanitization worked
        new_findings = []
        new_findings.extend(pii_detector.analyze(sanitized_content))
        new_findings.extend(secret_detector.analyze(sanitized_content))
        new_findings.extend(source_code_detector.analyze(sanitized_content))
        new_findings.extend(financial_legal_detector.analyze(sanitized_content))
        new_findings.extend(ml_classifier.analyze(sanitized_content))
        
        new_risk_score, _ = risk_aggregator.deduplicate_and_score(new_findings)
        if new_risk_score > 0.8: # If still highly risky, escalate
            final_action = "BLOCK"

    # 3.6 Route to AI Provider (Phase 13)
    if final_action in ["ALLOW", "SANITIZE"] and text_to_route:
        from ai_engine.router import RoutingManager
        router_mgr = RoutingManager(db)
        try:
            provider_response, provider_used = router_mgr.route_request(destination_id, text_to_route)
        except Exception as e:
            final_action = "FAILED"
            provider_response = f"Routing failed: {str(e)}"

    response_findings_api = []
    response_action = None

    # 3.7 Response Analysis (Phase 15)
    if provider_response and final_action != "FAILED":
        resp_finds = response_detector.analyze(provider_response)
        if resp_finds:
            resp_risk_score, _ = risk_aggregator.deduplicate_and_score(resp_finds)
            response_action = evaluator.evaluate(resp_finds, resp_risk_score, current_user)
            for f in resp_finds:
                f_out = f.copy()
                if "start_idx" in f_out: del f_out["start_idx"]
                if "end_idx" in f_out: del f_out["end_idx"]
                response_findings_api.append(FindingSchema(**f_out))
            if response_action == "BLOCK":
                provider_response = "[BLOCKED BY RESPONSE ANALYZER]"

    # 4. Persistence
    db_request = DBRequest(
        user_id=current_user.id,
        destination_id=provider_used if provider_used else destination_id,
        request_hash=file_hash,
        raw_content_hash=file_hash,
        status="PROCESSED" if final_action != "FAILED" else "FAILED",
        final_action=final_action,
        risk_score=risk_score
    )
    db.add(db_request)
    db.flush()
    
    response_findings = []
    for f in findings:
        db_finding = DBFinding(
            request_id=db_request.id,
            category=f["category"],
            confidence=f["confidence"],
            evidence=f["evidence"],
            detector_source=f["detector_source"]
        )
        db.add(db_finding)
        
        # For the API response, exclude indices
        f_out = f.copy()
        if "start_idx" in f_out: del f_out["start_idx"]
        if "end_idx" in f_out: del f_out["end_idx"]
        response_findings.append(FindingSchema(**f_out))
        
    # 5. Audit Logging
    audit_log = AuditLog(
        event_type=f"REQUEST_{final_action}",
        actor_id=current_user.id,
        target_id=str(db_request.id),
        meta_data={
            "request_id": db_request.id,
            "user_id": current_user.id,
            "risk_score": risk_score, 
            "findings_count": len(findings), 
            "filename": filename, 
            "mime_type": mime_type,
            "aggregation_breakdown": aggregation_breakdown,
            "was_sanitized": final_action == "SANITIZE" or sanitized_content is not None,
            "provider_used": provider_used,
            "routing_failed": final_action == "FAILED",
            "response_action": response_action,
            "response_findings_count": len(response_findings_api)
        }
    )
    db.add(audit_log)
    db.commit()

    # 5.5 Webhook Alerts (Phase 14)
    if final_action == "BLOCK" and risk_score >= 0.8:
        from backend.services.webhook import WebhookDispatcher
        webhook = WebhookDispatcher()
        webhook.dispatch_critical_alert(
            event_type="CRITICAL_BLOCK",
            request_id=db_request.id,
            user_id=current_user.id,
            details={
                "risk_score": risk_score,
                "findings": [f["category"] for f in findings]
            }
        )

    return AnalyzeResponse(
        request_id=db_request.id,
        final_action=final_action,
        risk_score=risk_score,
        findings=response_findings,
        aggregation_breakdown=aggregation_breakdown,
        sanitized_content=sanitized_content,
        provider_response=provider_response,
        provider_used=provider_used,
        response_findings=response_findings_api,
        response_action=response_action
    )
