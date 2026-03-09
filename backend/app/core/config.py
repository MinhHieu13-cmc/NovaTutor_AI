from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    PROJECT_NAME: str = "NovaTutor AI"
    API_V1_STR: str = "/api/v1"

    # Runtime
    DEBUG: bool = False

    # Module Toggling
    ENABLE_RAG: bool = True
    ENABLE_PLUGINS: bool = True
    ENABLE_USAGE_TRACKING: bool = True
    
    # LLM Provider
    LLM_PROVIDER: str = "openai" # "openai", "anthropic", "google", "litellm"
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
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
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
    )

settings = Settings()
