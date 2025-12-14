"""Redis caching utilities for improving API performance."""
import json
from typing import Optional, Any
from datetime import timedelta

try:
    import redis.asyncio as redis
    from redis.asyncio import Redis
except ImportError:
    # Fallback for older redis versions
    import redis
    from redis import Redis

from app.core.config import settings


# Global Redis client instance
_redis_client: Optional[Redis] = None


async def get_redis_client() -> Optional[Redis]:
    """Get or create Redis client instance."""
    global _redis_client
    
    if _redis_client is None:
        try:
            # Use REDIS_URL if provided, otherwise construct from components
            if settings.REDIS_URL:
                redis_url = settings.REDIS_URL
                _redis_client = redis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                )
            else:
                # Construct Redis URL with username/password support (for Redis Cloud)
                if settings.REDIS_USERNAME and settings.REDIS_PASSWORD:
                    # Redis Cloud format: redis://username:password@host:port/db
                    redis_url = f"redis://{settings.REDIS_USERNAME}:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
                elif settings.REDIS_PASSWORD:
                    # Standard format: redis://:password@host:port/db
                    redis_url = f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
                else:
                    # No auth: redis://host:port/db
                    redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}/{settings.REDIS_DB}"
                
                _redis_client = redis.from_url(
                    redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                )
            
            # Test connection
            await _redis_client.ping()
            
        except Exception as e:
            # If Redis is not available, log warning but don't crash
            import logging
            logging.warning(f"Redis connection failed: {e}. Caching will be disabled.")
            _redis_client = None
    
    return _redis_client


async def close_redis_client():
    """Close Redis client connection."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None


async def get_cache(key: str) -> Optional[Any]:
    """
    Get value from cache.
    
    Args:
        key: Cache key
        
    Returns:
        Cached value or None if not found
    """
    client = await get_redis_client()
    if not client:
        return None
    
    try:
        value = await client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        import logging
        logging.warning(f"Cache get error for key {key}: {e}")
        return None


async def set_cache(key: str, value: Any, ttl: int) -> bool:
    """
    Set value in cache with TTL.
    
    Args:
        key: Cache key
        value: Value to cache (must be JSON serializable)
        ttl: Time to live in seconds
        
    Returns:
        True if successful, False otherwise
    """
    client = await get_redis_client()
    if not client:
        return False
    
    try:
        serialized = json.dumps(value, default=str)  # default=str handles dates
        await client.setex(key, ttl, serialized)
        return True
    except Exception as e:
        import logging
        logging.warning(f"Cache set error for key {key}: {e}")
        return False


async def delete_cache(key: str) -> bool:
    """
    Delete value from cache.
    
    Args:
        key: Cache key (supports patterns with *)
        
    Returns:
        True if successful, False otherwise
    """
    client = await get_redis_client()
    if not client:
        return False
    
    try:
        if '*' in key:
            # Pattern delete
            keys = await client.keys(key)
            if keys:
                await client.delete(*keys)
        else:
            await client.delete(key)
        return True
    except Exception as e:
        import logging
        logging.warning(f"Cache delete error for key {key}: {e}")
        return False


async def invalidate_schedule_cache(space_id: Optional[int] = None, date: Optional[str] = None):
    """
    Invalidate schedule cache.
    
    Args:
        space_id: Specific space ID to invalidate (None = all spaces)
        date: Specific date to invalidate (None = all dates)
    """
    if space_id and date:
        # Invalidate specific schedule
        key = f"schedule:{space_id}:{date}"
        await delete_cache(key)
    elif space_id:
        # Invalidate all schedules for a space
        await delete_cache(f"schedule:{space_id}:*")
    elif date:
        # Invalidate all schedules for a date
        await delete_cache(f"schedule:*:{date}")
    else:
        # Invalidate all schedules
        await delete_cache("schedule:*")


def get_schedule_cache_key(space_id: int, date: str) -> str:
    """Generate cache key for schedule endpoint."""
    return f"schedule:{space_id}:{date}"

