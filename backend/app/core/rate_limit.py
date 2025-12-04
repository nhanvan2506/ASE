"""Rate limiting middleware for API security."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response


class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self):
        # Store request counts: {identifier: [(timestamp, count), ...]}
        self.requests: Dict[str, list] = defaultdict(list)
        # Clean up old entries every 100 requests
        self._cleanup_counter = 0
    
    def is_allowed(
        self, 
        identifier: str, 
        max_requests: int = 10, 
        window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Check if request is allowed.
        
        Returns:
            (is_allowed, remaining_requests)
        """
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(seconds=window_seconds)
        
        # Get requests in current window
        request_times = self.requests[identifier]
        
        # Remove old requests outside window
        request_times[:] = [ts for ts in request_times if ts > window_start]
        
        # Check if limit exceeded
        if len(request_times) >= max_requests:
            remaining = 0
            return False, remaining
        
        # Add current request
        request_times.append(now)
        remaining = max_requests - len(request_times)
        
        # Periodic cleanup
        self._cleanup_counter += 1
        if self._cleanup_counter >= 100:
            self._cleanup()
            self._cleanup_counter = 0
        
        return True, remaining
    
    def _cleanup(self):
        """Remove old entries to prevent memory leak."""
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=1)
        
        for identifier in list(self.requests.keys()):
            self.requests[identifier] = [
                ts for ts in self.requests[identifier] if ts > cutoff
            ]
            if not self.requests[identifier]:
                del self.requests[identifier]


# Global rate limiter instance
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware."""
    
    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for health check
        if request.url.path == "/health":
            return await call_next(request)
        
        # Get client identifier (IP address or user ID if authenticated)
        identifier = request.client.host if request.client else "unknown"
        
        # Different limits for different endpoints
        max_requests = 100  # Default
        window_seconds = 60
        
        # Stricter limits for auth endpoints
        if request.url.path.startswith("/auth"):
            max_requests = 5  # 5 requests per minute for auth
            window_seconds = 60
        
        # Stricter limits for booking creation
        elif request.url.path.startswith("/bookings") and request.method == "POST":
            max_requests = 10  # 10 bookings per minute
            window_seconds = 60
        
        # Check rate limit
        is_allowed, remaining = rate_limiter.is_allowed(
            identifier, max_requests, window_seconds
        )
        
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please try again later.",
                headers={
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int((datetime.now(timezone.utc) + timedelta(seconds=window_seconds)).timestamp()))
                }
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response


