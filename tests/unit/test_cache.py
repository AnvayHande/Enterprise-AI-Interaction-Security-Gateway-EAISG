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

def test_cache_sqlalchemy_model():
    _local_cache.clear()

    # Mock a SQLAlchemy model class
    class MockUser:
        __table__ = "users"
        def __init__(self, id, name):
            self.id = id
            self.name = name
            
        def __str__(self):
            # Simulate the default object representation that changes per instance
            return f"<User at {id(self)}>"

    call_count = 0

    @cached("test_model")
    def expensive_func(dummy, user):
        nonlocal call_count
        call_count += 1
        return f"Processed user {user.id}"

    user1 = MockUser(id=1, name="Alice")
    user2 = MockUser(id=1, name="Alice") # Same conceptual user, different instance

    res1 = expensive_func(None, user1)
    res2 = expensive_func(None, user2)

    assert res1 == "Processed user 1"
    assert res1 == res2
    assert call_count == 1 # Cache hit based on model ID!
