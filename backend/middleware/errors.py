import uuid
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": f"ERR_{exc.status_code}",
            "message": exc.detail,
            "reference_id": str(uuid.uuid4())
        },
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "ERR_VALIDATION",
            "message": "Invalid request payload",
            "details": exc.errors(),
            "reference_id": str(uuid.uuid4())
        },
    )

async def global_exception_handler(request: Request, exc: Exception):
    ref_id = str(uuid.uuid4())
    # In production, we would log the full stack trace with this ref_id here.
    print(f"[ERROR {ref_id}] {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "ERR_INTERNAL",
            "message": "An unexpected internal server error occurred.",
            "reference_id": ref_id
        },
    )
