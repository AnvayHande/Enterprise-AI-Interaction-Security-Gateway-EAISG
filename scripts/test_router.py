import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base, AIDestination
from ai_engine.router import RoutingManager

def test_router():
    print("Setting up test database...")
    engine = create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    # 1. Setup Destinations
    # Fallback chain: OpenAI -> Azure -> Local
    dest_local = AIDestination(id=3, name="Local Llama3", provider="local", is_active=True, trust_level="INTERNAL")
    dest_azure = AIDestination(id=2, name="Azure OpenAI", provider="azure", is_active=False, trust_level="PARTNER", fallback_destination_id=3)
    dest_openai = AIDestination(id=1, name="OpenAI Public", provider="openai", is_active=False, trust_level="PUBLIC", fallback_destination_id=2)
    
    db.add_all([dest_local, dest_azure, dest_openai])
    db.commit()
    
    # 2. Test Routing Manager
    router = RoutingManager(db)
    prompt = "Hello, this is a test prompt."
    
    print("\nAttempting to route to destination 1 (OpenAI)...")
    print("Note: OpenAI and Azure are configured as inactive (simulating downtime).")
    
    response, final_dest_id = router.route_request(destination_id=1, prompt=prompt)
    
    print(f"\nFinal Response Received:\n{response}")
    print(f"Final Destination Used: {final_dest_id} (Expected 3 since 1 and 2 are down)")
    
    assert final_dest_id == 3, "Fallback chain failed to reach destination 3!"
    print("\nSUCCESS: Fallback routing works perfectly.")

if __name__ == "__main__":
    test_router()
