import time
from typing import Dict, List
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from app.core.config import settings

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # In-memory storage for demonstration.
        # In production, use Redis.
        self.usage: Dict[str, List[float]] = {}
        self.exempt_paths = {
            "/api/v1/auth/me",
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/google",
            "/api/v1/auth/logout",
        }

    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        # Only throttle API endpoints, never static/frontend traffic
        if not request.url.path.startswith("/api/v1"):
            return await call_next(request)

        # Exempt auth/session endpoints to prevent login/homepage lockouts
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        # Build a stable key: workspace -> authenticated user -> client IP
        workspace_id = request.headers.get("X-Workspace-ID")
        user_id = request.headers.get("X-User-ID")
        client_ip = request.client.host if request.client else "unknown"
        key = workspace_id or user_id or f"ip:{client_ip}"

        # Auth endpoints often need a higher RPM than normal API traffic
        if request.url.path.startswith("/api/v1/auth"):
            limit_rpm = settings.RATE_LIMIT_AUTH_RPM
        else:
            limit_rpm = settings.DEFAULT_RATE_LIMIT_RPM
        
        now = time.time()
        if key not in self.usage:
            self.usage[key] = []
        
        # Clean up old timestamps
        self.usage[key] = [t for t in self.usage[key] if now - t < 60]
        
        if len(self.usage[key]) >= limit_rpm:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        self.usage[key].append(now)
        
        response = await call_next(request)
        remaining = max(limit_rpm - len(self.usage[key]), 0)
        response.headers["X-RateLimit-Limit"] = str(limit_rpm)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
