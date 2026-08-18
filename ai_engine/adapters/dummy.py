import time
from typing import Optional, Dict, Any
from .base import ProviderAdapter

class DummyAdapter(ProviderAdapter):
    """
    A mock provider for testing routing without hitting real APIs.
    Simulates latency and allows forcing health check failures.
    """
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        super().__init__(name, config)
        self.latency = self.config.get("latency", 0.1)
        self.is_healthy = self.config.get("is_healthy", True)
        self.response_text = self.config.get("response_text", f"Response from {self.name}")

    def health_check(self) -> bool:
        """Returns the configured health status."""
        return self.is_healthy

    def generate(self, prompt: str, **kwargs) -> str:
        """Simulates generation with latency."""
        if not self.is_healthy:
            raise ConnectionError(f"Provider {self.name} is currently offline.")
        
        if self.latency > 0:
            time.sleep(self.latency)
            
        return f"{self.response_text}\n(Prompt received: {prompt[:50]}...)"
