import pytest
import time
from core.cache import cached, _local_cache, generate_cache_key

def test_cache_hit():
    _local_cache.clear()
    
    # Simple function to test caching
    call_count = 0
    
    @cached("test_func")
    def expensive_func(dummy, payload):
        nonlocal call_count
        call_count += 1
        return f"Processed {payload}"
        
    res1 = expensive_func(None, "hello")
    res2 = expensive_func(None, "hello")
    
    assert res1 == "Processed hello"
    assert res1 == res2
    assert call_count == 1 # Should only be called once

def test_cache_miss():
    _local_cache.clear()
    
    call_count = 0
    
    @cached("test_func")
    def expensive_func(dummy, payload):
        nonlocal call_count
        call_count += 1
        return f"Processed {payload}"
        
    res1 = expensive_func(None, "hello")
    res2 = expensive_func(None, "world")
    
    assert res1 != res2
    assert call_count == 2 # Called twice with different arguments
