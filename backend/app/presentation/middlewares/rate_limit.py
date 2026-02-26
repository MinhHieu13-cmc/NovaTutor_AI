import time
from typing import Dict, List
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # In-memory storage for demonstration. 
        # In production, use Redis.
        self.usage: Dict[str, List[float]] = {} 

    async def dispatch(self, request: Request, call_next):
        # Extract workspace_id from path or header
        # This is a simplified example
        workspace_id = request.headers.get("X-Workspace-ID")
        
        if not workspace_id:
            return await call_next(request)

        # Mock fetching workspace limit (should come from DB/cache)
        # For now, use a default
        limit_rpm = 60 
        
        now = time.time()
        if workspace_id not in self.usage:
            self.usage[workspace_id] = []
        
        # Clean up old timestamps
        self.usage[workspace_id] = [t for t in self.usage[workspace_id] if now - t < 60]
        
        if len(self.usage[workspace_id]) >= limit_rpm:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded for workspace"
            )
            
        self.usage[workspace_id].append(now)
        
        response = await call_next(request)
        return response
