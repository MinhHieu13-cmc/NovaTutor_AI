from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "NovaTutor AI"
    API_V1_STR: str = "/api/v1"

    # Runtime
    DEBUG: bool = False
    RUN_MIGRATIONS_ON_STARTUP: bool = False

    # Module Toggling
    ENABLE_RAG: bool = True
    ENABLE_PLUGINS: bool = True
    ENABLE_USAGE_TRACKING: bool = True
    
    # LLM Provider
    LLM_PROVIDER: str = "openai" # "openai", "anthropic", "google", "litellm"
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_API_KEY_SECRET: Optional[str] = None
    LITELLM_MODEL: str = "gpt-3.5-turbo"
    
    # GCP Configuration
    GCP_PROJECT_ID: Optional[str] = None
    GCP_LOCATION: str = "us-central1"
    
    # Cloud SQL
    DATABASE_URL: Optional[str] = None
    
    # Vertex AI Vector Search
    VERTEX_INDEX_ID: Optional[str] = None
    VERTEX_ENDPOINT_ID: Optional[str] = None
    
    # Vector Database
    VECTOR_DB_TYPE: str = "postgresql" # "supabase", "pinecone", "milvus", "vertex", "postgresql"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    
    # Default Rate Limiting (fallback if not specified per workspace)
    DEFAULT_RATE_LIMIT_RPM: int = 60
    RATE_LIMIT_AUTH_RPM: int = 120
    RATE_LIMIT_BURST_PER_SECOND: int = 10

    # Auth & security hardening (Phase 4)
    JWT_SECRET_KEY: str = "local_dev_secret_change_before_deploy_32chars"
    JWT_ALGORITHM: str = "HS256"
    JWT_TOKEN_TTL_MINUTES: int = 60 * 24 * 7
    ENFORCE_STRONG_JWT_SECRET: bool = False
    AUTH_PASSWORD_MIN_LENGTH: int = 8

    # Security headers
    ENABLE_SECURITY_HEADERS: bool = True
    ENABLE_ACCESS_LOGS: bool = True
    
    # CORS
    FRONTEND_ORIGINS: str = "http://localhost:3000,https://novatutor-frontend-qz2gdtaatq-uc.a.run.app,https://novatutor-frontend-366729322781.us-central1.run.app"

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

    def is_jwt_secret_strong(self) -> bool:
        secret = self.JWT_SECRET_KEY or ""
        if len(secret) < 32:
            return False
        weak_markers = [
            "local_dev_secret",
            "change_before_deploy",
            "123456",
            "password",
            "secret",
        ]
        lower_secret = secret.lower()
        return not any(marker in lower_secret for marker in weak_markers)

    def validate_security_settings(self) -> None:
        if self.ENFORCE_STRONG_JWT_SECRET and not self.is_jwt_secret_strong():
            raise ValueError(
                "JWT_SECRET_KEY is weak. Set a strong secret (>=32 chars) before production deployment."
            )

settings = Settings()
