from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from database.models import AIDestination
from .adapters.base import ProviderAdapter
from .adapters.dummy import DummyAdapter

class RoutingManager:
    """
    Manages routing of requests to AI Provider Adapters.
    Handles dynamic instantiation of adapters, health checks, and fallback logic.
    """
    def __init__(self, db: Session):
        self.db = db
        # In a real system, we'd cache initialized adapters here to reuse connections.
        self._adapters: Dict[int, ProviderAdapter] = {}

    def _get_adapter(self, destination: AIDestination) -> ProviderAdapter:
        """Instantiates or retrieves the appropriate adapter for a destination."""
        if destination.id in self._adapters:
            return self._adapters[destination.id]
        
        # For the MVP, we only use DummyAdapter. In production, we'd switch based on provider name.
        # e.g., if destination.provider == 'openai': return OpenAIAdapter(...)
        config = {
            "is_healthy": destination.is_active,
            "response_text": f"Response from {destination.name} ({destination.provider})"
        }
        
        adapter = DummyAdapter(name=destination.name, config=config)
        self._adapters[destination.id] = adapter
        return adapter

    def route_request(self, destination_id: int, prompt: str) -> Tuple[str, int]:
        """
        Routes the prompt to the requested destination.
        If the primary destination is unhealthy, follows the fallback chain.
        Returns a tuple of (response_text, actual_destination_id_used).
        """
        current_dest_id = destination_id
        
        while current_dest_id:
            destination = self.db.query(AIDestination).filter(AIDestination.id == current_dest_id).first()
            if not destination:
                raise ValueError(f"Destination {current_dest_id} not found.")

            adapter = self._get_adapter(destination)
            
            if adapter.health_check():
                try:
                    response = adapter.generate(prompt)
                    return response, current_dest_id
                except Exception as e:
                    # Log exception here in production
                    print(f"Error generating from {destination.name}: {e}")
                    pass # Try fallback
            else:
                print(f"Provider {destination.name} is unhealthy. Attempting fallback...")

            # Follow the fallback chain
            current_dest_id = destination.fallback_destination_id
            
        raise RuntimeError(f"All destinations in the fallback chain failed for initial destination {destination_id}.")
