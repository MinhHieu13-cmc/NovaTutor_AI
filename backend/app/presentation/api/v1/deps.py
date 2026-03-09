import os
import vertexai
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from google.cloud import aiplatform
from app.domain.models.core import User, UserRole
from app.application.services.orchestrator import Orchestrator
from app.application.services.rag_engine import RAGEngine
from app.domain.services.plugin_base import PluginRegistry
from app.domain.services.interfaces import (
    ILLMProvider, IEmbeddingProvider, IVectorStore, 
    ChatMessage, LLMResponse
)
from app.core.config import settings

security = HTTPBearer()

# Global Initialization for Vertex AI to avoid ADC errors in Agents
os.environ["GOOGLE_API_KEY"] = settings.GOOGLE_API_KEY or ""
aiplatform.init(
    project=os.getenv("GCP_PROJECT_ID", "novatotorai-489214"),
    location=os.getenv("GCP_LOCATION", "us-central1")
)
vertexai.init(
    project=os.getenv("GCP_PROJECT_ID", "novatotorai-489214"),
    location=os.getenv("GCP_LOCATION", "us-central1")
)

async def get_current_user(cred: HTTPAuthorizationCredentials = Depends(security)) -> User:
    # In production, verify JWT with Supabase/Auth0
    # For template, return a mock user
    token = cred.credentials
    return User(
        id="00000000-0000-0000-0000-000000000000",
        email="user@example.com",
        role=UserRole.ADMIN,
        tenant_id="00000000-0000-0000-0000-000000000000"
    )

from app.infrastructure.llm.vertexai_provider import VertexAIProvider
from app.application.agents.tutor_agent import TutorAgent
from app.application.agents.curriculum_agent import CurriculumAgent
from app.application.agents.memory_agent import MemoryAgent
from app.application.agents.assessment_agent import AssessmentAgent
from app.application.agents.emotion_adapter import EmotionAdapter
from app.application.services.tool_policy import ToolPolicyLayer
from google.adk.models.registry import LLMRegistry

from app.infrastructure.persistence.repositories.cloud_sql_repository import CloudSQLStudentRepository
from app.infrastructure.persistence.repositories.firestore_session_repository import CloudSQLSessionRepository
from app.infrastructure.vector.vertex_ai_repository import VertexAIVectorRepository
from app.infrastructure.vector.postgresql_vector_store import PostgreSQLVectorStore

def get_student_repository() -> CloudSQLStudentRepository:
    return CloudSQLStudentRepository(connection_string=settings.DATABASE_URL or "")

def get_session_repository() -> CloudSQLSessionRepository:
    return CloudSQLSessionRepository(connection_string=settings.DATABASE_URL or "")

def get_vector_repository() -> VertexAIVectorRepository:
    return VertexAIVectorRepository(
        index_id=settings.VERTEX_INDEX_ID or "",
        endpoint_id=settings.VERTEX_ENDPOINT_ID or ""
    )

def get_llm_provider() -> ILLMProvider:
    # Use direct Vertex AI provider
    return VertexAIProvider(
        project_id=settings.GCP_PROJECT_ID or "",
        location=settings.GCP_LOCATION,
        default_model="gemini-live-2.5-flash-native-audio"
    )

def get_vector_store() -> IVectorStore:
    if settings.VECTOR_DB_TYPE == "postgresql":
        return PostgreSQLVectorStore(connection_string=settings.DATABASE_URL or "")
    elif settings.VECTOR_DB_TYPE == "supabase":
        # return SupabaseVectorStore(...)
        pass
    elif settings.VECTOR_DB_TYPE == "pinecone":
        # return PineconeVectorStore(...)
        pass
    # For template, return a mock
    class MockVectorStore(IVectorStore):
        async def add_documents(self, texts, embeddings, metadatas): pass
        async def similarity_search(self, query_embedding, k=4, filter=None): return []
    return MockVectorStore()

def get_rag_engine(vector_store: IVectorStore = Depends(get_vector_store)) -> Optional[RAGEngine]:
    if not settings.ENABLE_RAG:
        return None
    
    class MockEmbedding(IEmbeddingProvider):
        async def embed_query(self, text): return [0.1] * 1536
        async def embed_documents(self, texts): return [[0.1] * 1536]
        
    return RAGEngine(
        embedding_provider=MockEmbedding(),
        vector_store=vector_store
    )

def get_orchestrator(
    rag_engine: Optional[RAGEngine] = Depends(get_rag_engine),
    llm_provider: ILLMProvider = Depends(get_llm_provider),
    student_repo = Depends(get_student_repository),
    session_repo = Depends(get_session_repository),
    vector_repo = Depends(get_vector_repository)
) -> Orchestrator:
    plugin_registry = PluginRegistry() if settings.ENABLE_PLUGINS else None
    
    tutor_agent = TutorAgent()
    curriculum_agent = CurriculumAgent(vector_repo=vector_repo)
    memory_agent = MemoryAgent(student_repo=student_repo, session_repo=session_repo)
    assessment_agent = AssessmentAgent()
    emotion_adapter = EmotionAdapter()
    tool_policy = ToolPolicyLayer()
            
    return Orchestrator(
        llm=llm_provider,
        rag_engine=rag_engine,
        plugin_registry=plugin_registry,
        tutor_agent=tutor_agent,
        curriculum_agent=curriculum_agent,
        memory_agent=memory_agent,
        assessment_agent=assessment_agent,
        emotion_adapter=emotion_adapter,
        tool_policy=tool_policy
    )
