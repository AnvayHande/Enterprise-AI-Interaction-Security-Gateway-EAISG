from abc import ABC, abstractmethod
from typing import Optional, Dict, Any

class ProviderAdapter(ABC):
    """
    Base class for all AI provider adapters (OpenAI, Anthropic, Local, Dummy).
    """
    def __init__(self, name: str, config: Optional[Dict[str, Any]] = None):
        self.name = name
        self.config = config or {}

    @abstractmethod
    def health_check(self) -> bool:
        """
        Check if the provider is reachable and healthy.
        Returns True if healthy, False otherwise.
        """
        pass

    @abstractmethod
    def generate(self, prompt: str, **kwargs) -> str:
        """
        Generate a response from the provider given a prompt.
        """
        pass
