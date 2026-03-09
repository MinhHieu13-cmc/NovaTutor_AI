from typing import List, Dict, Any, Optional
from sqlalchemy import Column, Integer, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from pgvector.sqlalchemy import Vector
from app.domain.services.interfaces import IVectorStore
from app.infrastructure.database.connection import async_session
from app.infrastructure.database.models import Base

# Add vector column to existing table or create new one
# For now, create a simple documents table with vector embeddings

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text)
    meta_data = Column(JSON)
    embedding = Column(Vector(1536))  # Assuming 1536 dimensions for embeddings

class PostgreSQLVectorStore(IVectorStore):
    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    async def add_documents(self, texts: List[str], embeddings: List[List[float]], metadatas: Optional[List[Dict[str, Any]]] = None) -> None:
        async with async_session() as session:
            for text, embedding, metadata in zip(texts, embeddings, metadatas or [{}] * len(texts)):
                doc = Document(
                    content=text,
                    embedding=embedding,
                    meta_data=metadata
                )
                session.add(doc)
            await session.commit()

    async def similarity_search(self, query_embedding: List[float], k: int = 4, filter: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        async with async_session() as session:
            # Build the query
            query = select(Document).order_by(Document.embedding.cosine_distance(query_embedding)).limit(k)

            # Apply filters if provided
            if filter:
                for key, value in filter.items():
                    query = query.where(Document.meta_data[key] == value)

            result = await session.execute(query)
            docs = result.scalars().all()

            return [
                {
                    "content": doc.content,
                    "metadata": doc.meta_data,
                    "score": 1.0  # Could calculate actual similarity score
                }
                for doc in docs
            ]
