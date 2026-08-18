import httpx
import logging
from typing import Dict, Any
from database.config import settings

logger = logging.getLogger(__name__)

async def notify_escalation(event_type: str, request_id: int, user_email: str, risk_score: float, details: Dict[str, Any]):
    """
    Triggers an asynchronous webhook notification for critical events (e.g., critical risk block).
    This function should be called using BackgroundTasks in FastAPI.
    """
    webhook_url = getattr(settings, "ESCALATION_WEBHOOK_URL", None)
    if not webhook_url:
        logger.info(f"Escalation notification skipped (no webhook URL configured). Event: {event_type}, Request: {request_id}")
        return

    payload = {
        "event": event_type,
        "request_id": request_id,
        "user_email": user_email,
        "risk_score": risk_score,
        "details": details
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload, timeout=5.0)
            if response.status_code >= 400:
                logger.error(f"Failed to deliver escalation webhook. Status: {response.status_code}, Body: {response.text}")
            else:
                logger.info(f"Escalation webhook delivered successfully for Request: {request_id}")
    except Exception as e:
        logger.error(f"Error delivering escalation webhook for Request {request_id}: {str(e)}")
