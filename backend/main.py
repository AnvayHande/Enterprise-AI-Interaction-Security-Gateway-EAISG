from fastapi import FastAPI
from backend.routes import auth

app = FastAPI(title="EAISG Gateway API", version="1.0.0")

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
