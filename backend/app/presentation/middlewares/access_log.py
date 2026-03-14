import json
import time
from uuid import uuid4
from starlette.middleware.base import BaseHTTPMiddleware


class AccessLogMiddleware(BaseHTTPMiddleware):
    """Lightweight JSON access logs with request id and duration."""

    async def dispatch(self, request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        start = time.perf_counter()

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        log_line = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        }
        print(json.dumps(log_line, ensure_ascii=True))

        return response

