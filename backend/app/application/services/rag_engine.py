from typing import List, Dict, Any
from app.domain.services.interfaces import IEmbeddingProvider, IVectorStore

class RAGEngine:
    def __init__(
        self, 
        embedding_provider: IEmbeddingProvider,
        vector_store: IVectorStore
    ):
        self.embedding_provider = embedding_provider
        self.vector_store = vector_store

    async def ingest(self, text: str, workspace_id: str, metadata: Dict[str, Any] = None):
        embedding = await self.embedding_provider.embed_query(text)
        meta = metadata or {}
        meta['workspace_id'] = workspace_id
        await self.vector_store.add_documents([text], [embedding], [meta])

    async def query(self, text: str, workspace_id: str, k: int = 4) -> List[Dict[str, Any]]:
        query_embedding = await self.embedding_provider.embed_query(text)
        results = await self.vector_store.similarity_search(
            query_embedding, 
            k=k, 
            filter={"workspace_id": workspace_id}
        )
        return results
