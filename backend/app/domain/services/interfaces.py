from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Dict, Any, Optional
from pydantic import BaseModel

class ChatMessage(BaseModel):
    role: str
    content: str

class LLMResponse(BaseModel):
    content: str
    usage: Dict[str, int]
    metadata: Optional[Dict[str, Any]] = None

class ILLMProvider(ABC):
    @abstractmethod
    async def generate(self, messages: List[ChatMessage], **kwargs) -> LLMResponse:
        pass

    @abstractmethod
    async def stream(self, messages: List[ChatMessage], **kwargs) -> AsyncGenerator[str, None]:
        pass

class IEmbeddingProvider(ABC):
    @abstractmethod
    async def embed_query(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        pass

class IVectorStore(ABC):
    @abstractmethod
    async def add_documents(self, texts: List[str], embeddings: List[List[float]], metadatas: List[Dict[str, Any]]):
        pass

    @abstractmethod
    async def similarity_search(self, query_embedding: List[float], k: int = 4, filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        pass
