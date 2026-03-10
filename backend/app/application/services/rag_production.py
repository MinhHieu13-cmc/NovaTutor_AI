"""
Production RAG Engine - Document Processing & Embedding
Handles PDF chunking, embedding generation, and vector storage with Vertex AI
"""
import os
import io
from typing import List, Dict, Any, Optional
import asyncpg
from google.cloud import storage, aiplatform
from PyPDF2 import PdfReader

# Initialize GCP clients
storage_client = storage.Client()
aiplatform.init(
    project=os.getenv("GCP_PROJECT_ID"),
    location=os.getenv("GCP_LOCATION", "us-central1")
)

# Database URL
_DATABASE_URL_RAW = os.getenv("DATABASE_URL", "")
DATABASE_URL = _DATABASE_URL_RAW.replace("postgresql+asyncpg://", "postgresql://") if _DATABASE_URL_RAW else None

class ProductionRAGEngine:
    def __init__(self):
        self.chunk_size = 500  # characters per chunk
        self.chunk_overlap = 50
        self.embedding_model = "textembedding-gecko@003"
    
    async def process_document(self, document_id: str, document_url: str, course_id: str) -> int:
        """
        Process a document: download, chunk, embed, store
        Returns number of chunks created
        """
        try:
            # 1. Download document from Cloud Storage
            text = await self._download_and_extract_text(document_url)
            
            # 2. Chunk the text
            chunks = self._chunk_text(text)
            
            # 3. Generate embeddings
            embeddings = await self._generate_embeddings(chunks)
            
            # 4. Store in database
            await self._store_embeddings(document_id, course_id, chunks, embeddings)
            
            return len(chunks)
        
        except Exception as e:
            print(f"Error processing document {document_id}: {str(e)}")
            raise
    
    async def _download_and_extract_text(self, document_url: str) -> str:
        """Download PDF from Cloud Storage and extract text"""
        try:
            # Parse GCS URL
            if document_url.startswith("gs://"):
                bucket_name = document_url.split("/")[2]
                blob_path = "/".join(document_url.split("/")[3:])
            elif "storage.googleapis.com" in document_url:
                parts = document_url.split("/")
                bucket_name = parts[3]
                blob_path = "/".join(parts[4:])
            else:
                raise ValueError(f"Invalid GCS URL: {document_url}")
            
            # Download file
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_path)
            pdf_bytes = blob.download_as_bytes()
            
            # Extract text from PDF
            pdf_reader = PdfReader(io.BytesIO(pdf_bytes))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        
        except Exception as e:
            print(f"Error downloading/extracting document: {str(e)}")
            raise
    
    def _chunk_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + self.chunk_size
            
            # Try to break at sentence boundary
            if end < text_length:
                # Look for period, question mark, or exclamation point
                for i in range(end, start + self.chunk_size - 100, -1):
                    if text[i] in '.?!':
                        end = i + 1
                        break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - self.chunk_overlap
        
        return chunks
    
    async def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings using Vertex AI"""
        try:
            from vertexai.language_models import TextEmbeddingModel
            
            model = TextEmbeddingModel.from_pretrained(self.embedding_model)
            embeddings = []
            
            # Process in batches of 5 (API limit)
            batch_size = 5
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                batch_embeddings = model.get_embeddings(batch)
                embeddings.extend([emb.values for emb in batch_embeddings])
            
            return embeddings
        
        except Exception as e:
            print(f"Error generating embeddings: {str(e)}")
            raise
    
    async def _store_embeddings(
        self,
        document_id: str,
        course_id: str,
        chunks: List[str],
        embeddings: List[List[float]]
    ) -> None:
        """Store chunks and embeddings in database"""
        if not DATABASE_URL:
            raise Exception("DATABASE_URL not configured")
        
        conn = None
        try:
            conn = await asyncpg.connect(DATABASE_URL)
            
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                chunk_id = f"{document_id}_{i}"
                
                # Convert embedding to pgvector format
                embedding_str = "[" + ",".join(map(str, embedding)) + "]"
                
                await conn.execute(
                    """
                    INSERT INTO document_embeddings (id, document_id, chunk_text, embedding, chunk_index)
                    VALUES ($1, $2, $3, $4::vector, $5)
                    ON CONFLICT (id) DO UPDATE
                    SET chunk_text = EXCLUDED.chunk_text,
                        embedding = EXCLUDED.embedding,
                        chunk_index = EXCLUDED.chunk_index
                    """,
                    chunk_id,
                    document_id,
                    chunk,
                    embedding_str,
                    i
                )
        
        finally:
            if conn:
                await conn.close()
    
    async def semantic_search(
        self,
        query: str,
        course_id: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform semantic search over document chunks
        Returns top_k most relevant chunks
        """
        try:
            # 1. Generate query embedding
            from vertexai.language_models import TextEmbeddingModel
            model = TextEmbeddingModel.from_pretrained(self.embedding_model)
            query_embedding = model.get_embeddings([query])[0].values
            
            # 2. Search in database
            if not DATABASE_URL:
                raise Exception("DATABASE_URL not configured")
            
            conn = None
            try:
                conn = await asyncpg.connect(DATABASE_URL)
                
                # Build query
                if course_id:
                    # Filter by course
                    query_sql = """
                        SELECT 
                            de.id,
                            de.document_id,
                            de.chunk_text,
                            de.chunk_index,
                            cd.document_name,
                            cd.course_id,
                            (de.embedding <-> $1::vector) as distance
                        FROM document_embeddings de
                        JOIN course_documents cd ON de.document_id = cd.id
                        WHERE cd.course_id = $2
                        ORDER BY de.embedding <-> $1::vector
                        LIMIT $3
                    """
                    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
                    results = await conn.fetch(query_sql, embedding_str, course_id, top_k)
                else:
                    # Search all documents
                    query_sql = """
                        SELECT 
                            de.id,
                            de.document_id,
                            de.chunk_text,
                            de.chunk_index,
                            cd.document_name,
                            cd.course_id,
                            (de.embedding <-> $1::vector) as distance
                        FROM document_embeddings de
                        JOIN course_documents cd ON de.document_id = cd.id
                        ORDER BY de.embedding <-> $1::vector
                        LIMIT $2
                    """
                    embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"
                    results = await conn.fetch(query_sql, embedding_str, top_k)
                
                # Format results
                chunks = []
                for row in results:
                    chunks.append({
                        "chunk_id": row["id"],
                        "document_id": row["document_id"],
                        "document_name": row["document_name"],
                        "course_id": row["course_id"],
                        "chunk_text": row["chunk_text"],
                        "chunk_index": row["chunk_index"],
                        "similarity_score": 1 - float(row["distance"])  # Convert distance to similarity
                    })
                
                return chunks
            
            finally:
                if conn:
                    await conn.close()
        
        except Exception as e:
            print(f"Error in semantic search: {str(e)}")
            raise

# Global RAG engine instance
production_rag_engine = ProductionRAGEngine()

