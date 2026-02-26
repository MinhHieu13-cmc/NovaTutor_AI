import os
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.domain.models.core import User, UserRole
from backend.app.application.services.orchestrator import Orchestrator
from backend.app.application.services.rag_engine import RAGEngine
from backend.app.domain.services.plugin_base import PluginRegistry
from backend.app.domain.services.interfaces import (
    ILLMProvider, IEmbeddingProvider, IVectorStore, 
    ChatMessage, LLMResponse
)
# Mock imports for providers - in real app, these would be concrete implementations
# from backend.app.infrastructure.external.openai_provider import OpenAIProvider

security = HTTPBearer()

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

from backend.app.infrastructure.llm.litellm_provider import LiteLLMProvider
from backend.app.application.agents.tutor_agent import TutorAgent
from backend.app.core.config import settings

def get_llm_provider() -> ILLMProvider:
    # Default to LiteLLM for routing
    return LiteLLMProvider(default_model=settings.LITELLM_MODEL)

def get_vector_store() -> IVectorStore:
    if settings.VECTOR_DB_TYPE == "supabase":
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
    llm_provider: ILLMProvider = Depends(get_llm_provider)
) -> Orchestrator:
    plugin_registry = PluginRegistry() if settings.ENABLE_PLUGINS else None
    
    tutor_agent = TutorAgent(api_key=settings.GOOGLE_API_KEY)
            
    return Orchestrator(
        llm=llm_provider,
        rag_engine=rag_engine,
        plugin_registry=plugin_registry,
        tutor_agent=tutor_agent
    )
