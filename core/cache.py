import hashlib
import json
from typing import Any, Callable
from functools import wraps
from cachetools import TTLCache

# Simple in-memory fallback for local development.
# In a real environment, this should wrap Redis operations.
_local_cache = TTLCache(maxsize=10000, ttl=3600)

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a consistent hash key for the given arguments."""
    # Convert args/kwargs to a JSON string. Sort keys for consistency.
    try:
        payload = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        hash_val = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        return f"{prefix}:{hash_val}"
    except TypeError:
        # Fallback if args contain non-serializable objects (like SQLAlchemy Session)
        return None

def cached(prefix: str, ttl_seconds: int = 3600):
    """
    Decorator to cache the result of a synchronous or asynchronous function.
    """
    def decorator(func: Callable):
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Extract simple primitives for hashing to avoid hashing full objects
            # For LocalMLService, args[1] is typically the text content.
            # For PolicyEvaluator, we might have to pass specific primitives.
            cache_key = generate_cache_key(prefix, *args[1:], **kwargs)
            
            if cache_key and cache_key in _local_cache:
                return _local_cache[cache_key]
                
            result = func(*args, **kwargs)
            if cache_key:
                _local_cache[cache_key] = result
            return result
        return sync_wrapper
    return decorator
