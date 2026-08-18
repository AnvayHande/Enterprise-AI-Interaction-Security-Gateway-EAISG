import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from functools import wraps

# Simple in-memory token bucket for MVP (would use Redis in production)
# Format: user_id -> (tokens_remaining, last_refill_timestamp)
_RATE_LIMITS: Dict[int, Tuple[float, float]] = {}

def rate_limit(requests_per_minute: int = 60):
    """
    Decorator for FastAPI endpoints to enforce rate limits per user.
    Assumes `current_user` is injected by a dependency before this runs,
    or we extract it from the request state if available.
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id. In FastAPI, we can pull it from kwargs if `current_user` is a dependency.
            current_user = kwargs.get("current_user")
            
            if not current_user:
                # If no user is authenticated, we might rate-limit by IP, but for now we skip.
                return await func(*args, **kwargs)

            user_id = current_user.id
            now = time.time()
            
            # Refill rate (tokens per second)
            rate = requests_per_minute / 60.0
            
            # Initialize or get current bucket state
            if user_id not in _RATE_LIMITS:
                tokens = float(requests_per_minute)
                last_refill = now
            else:
                tokens, last_refill = _RATE_LIMITS[user_id]
                
            # Refill tokens based on time passed
            elapsed = now - last_refill
            tokens = min(float(requests_per_minute), tokens + elapsed * rate)
            
            if tokens < 1.0:
                # Rate limit exceeded
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later.",
                    headers={
                        "X-RateLimit-Limit": str(requests_per_minute),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(now + (1.0 - tokens) / rate))
                    }
                )
            
            # Consume 1 token
            _RATE_LIMITS[user_id] = (tokens - 1.0, now)
            
            import asyncio
            if asyncio.iscoroutinefunction(func):
                response = await func(*args, **kwargs)
            else:
                response = func(*args, **kwargs)
            
            return response
        return wrapper
    return decorator
