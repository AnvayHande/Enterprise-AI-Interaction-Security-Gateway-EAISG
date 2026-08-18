import asyncio
from typing import Dict, Any
import json

class WebhookDispatcher:
    """
    Simulates sending asynchronous webhooks to a SIEM or alerting system.
    """
    def __init__(self, webhook_url: str = ""):
        self.webhook_url = webhook_url

    async def _send_webhook(self, payload: Dict[str, Any]):
        """Background task that actually sends the webhook."""
        # For the MVP, we just simulate the delay and log it instead of failing on a missing URL
        await asyncio.sleep(0.5)
        print(f"\n[WEBHOOK ALERT FIRED] Sending to {self.webhook_url or 'STDOUT (Simulated)'}")
        print(json.dumps(payload, indent=2))
        print("[WEBHOOK ALERT COMPLETE]\n")

    def dispatch_critical_alert(self, event_type: str, request_id: int, user_id: int, details: Dict[str, Any]):
        """
        Fires and forgets a webhook for a critical alert.
        """
        payload = {
            "alert": "CRITICAL_SECURITY_EVENT",
            "event_type": event_type,
            "request_id": request_id,
            "user_id": user_id,
            "details": details
        }
        
        # Fire and forget
        asyncio.create_task(self._send_webhook(payload))
