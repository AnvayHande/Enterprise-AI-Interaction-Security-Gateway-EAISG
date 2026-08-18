from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from backend.routes import auth, analyze, dashboard, policies, settings, reviews
from backend.middleware.errors import http_exception_handler, validation_exception_handler, global_exception_handler

app = FastAPI(title="EAISG Gateway API", version="1.0.0")

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(analyze.router, prefix="/api/v1/analyze", tags=["analyze"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(policies.router, prefix="/api/v1/policies", tags=["policies"])
app.include_router(settings.router, prefix="/api/v1/settings", tags=["settings"])
app.include_router(reviews.router, prefix="/api/v1/reviews", tags=["reviews"])

from backend.middleware.metrics import MetricsMiddleware, metrics_endpoint

app.add_middleware(MetricsMiddleware)

@app.get("/api/v1/metrics", tags=["metrics"])
def get_metrics():
    return metrics_endpoint()

@app.get("/health")
def health_check():
    return {"status": "ok"}

