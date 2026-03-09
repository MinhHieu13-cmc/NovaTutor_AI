from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.presentation.api.v1.endpoints import router as api_router
from app.presentation.middlewares.rate_limit import RateLimitMiddleware
from app.core.config import settings
from app.infrastructure.database.connection import create_tables

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Domain-agnostic AI Platform Core",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Middleware
app.add_middleware(RateLimitMiddleware)

# Register routes
app.include_router(api_router, prefix="/api/v1")

@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    await create_tables()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
