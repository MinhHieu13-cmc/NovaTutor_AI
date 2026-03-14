from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.presentation.api.v1.endpoints import router as api_router
from app.presentation.api.v1.auth_gcp import router as auth_router
from app.presentation.api.v1.courses_gcp import router as courses_router
from app.presentation.api.v1.rag import router as rag_router
from app.presentation.api.v1.learning import router as learning_router
from app.presentation.api.v1.system import router as system_router
from app.presentation.middlewares.rate_limit import RateLimitMiddleware
from app.presentation.middlewares.security_headers import SecurityHeadersMiddleware
from app.presentation.middlewares.access_log import AccessLogMiddleware
from app.core.config import settings
from app.infrastructure.database.connection import create_tables

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="NovaTutor AI - Intelligent Tutoring System with RAG",
    version="2.0.0"
)

allowed_origins = [o.strip() for o in settings.FRONTEND_ORIGINS.split(",") if o.strip()]

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Middleware
app.add_middleware(RateLimitMiddleware)
if settings.ENABLE_SECURITY_HEADERS:
    app.add_middleware(SecurityHeadersMiddleware)
if settings.ENABLE_ACCESS_LOGS:
    app.add_middleware(AccessLogMiddleware)

# Register routes
app.include_router(api_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(courses_router, prefix="/api/v1")
app.include_router(rag_router, prefix="/api/v1")  # RAG & Chat endpoints
app.include_router(learning_router, prefix="/api/v1")  # Phase 2 learning endpoints
app.include_router(system_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup when explicitly enabled."""
    settings.validate_security_settings()
    if settings.RUN_MIGRATIONS_ON_STARTUP:
        await create_tables()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
