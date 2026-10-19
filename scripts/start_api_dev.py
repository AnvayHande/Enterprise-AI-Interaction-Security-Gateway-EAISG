import uvicorn
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.session import engine
from database.models import Base

def start_dev_server():
    print("Setting up local database for development...")
    # This will create eaisg.db locally if using sqlite
    Base.metadata.create_all(bind=engine)
    
    print("Starting FastAPI server...")
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    watch_dirs = [
        os.path.join(base_dir, "backend"),
        os.path.join(base_dir, "ai_engine"),
        os.path.join(base_dir, "database"),
        os.path.join(base_dir, "security"),
        os.path.join(base_dir, "policy_engine"),
    ]
    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=watch_dirs,
        reload_excludes=["*.db", "*.sqlite*", "*.db-journal", "*.log", "frontend/*", "extension/*"]
    )

if __name__ == "__main__":
    start_dev_server()
