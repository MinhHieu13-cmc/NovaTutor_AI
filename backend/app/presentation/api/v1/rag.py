"""
RAG & Chat API Endpoints
Handles document processing, semantic search, and AI-powered chat
"""
import os
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.application.services.rag_production import production_rag_engine
from app.presentation.api.v1.auth_gcp import get_current_user

router = APIRouter(prefix="/rag", tags=["rag"])

# Pydantic Models
class ProcessDocumentRequest(BaseModel):
    document_id: str
    document_url: str
    course_id: str

class ProcessDocumentResponse(BaseModel):
    message: str
    document_id: str
    chunks_created: int

class SemanticSearchRequest(BaseModel):
    query: str
    course_id: Optional[str] = None
    top_k: int = 5

class ChatRequest(BaseModel):
    message: str
    course_id: Optional[str] = None
    conversation_history: List[dict] = []

class ChatResponse(BaseModel):
    response: str
    sources: List[dict]
    conversation_id: Optional[str] = None

# Endpoints
@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Depends(get_current_user)
):
    """
    Process a document (teacher only): extract text, chunk, embed, store
    This is done in background after document upload
    """
    try:
        # Process document
        chunks_created = await production_rag_engine.process_document(
            document_id=request.document_id,
            document_url=request.document_url,
            course_id=request.course_id
        )

        return ProcessDocumentResponse(
            message="Document processed successfully",
            document_id=request.document_id,
            chunks_created=chunks_created
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.post("/search")
async def semantic_search(
    request: SemanticSearchRequest,
    authorization: Optional[str] = Depends(get_current_user)
):
    """
    Perform semantic search over course documents
    Returns relevant chunks based on query
    """
    try:
        results = await production_rag_engine.semantic_search(
            query=request.query,
            course_id=request.course_id,
            top_k=request.top_k
        )

        return {
            "query": request.query,
            "results": results,
            "total_results": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(
    request: ChatRequest,
    authorization: Optional[str] = Depends(get_current_user)
):
    """
    Chat with AI tutor using RAG context
    Returns AI response with source citations
    """
    try:
        from vertexai.generative_models import GenerativeModel
        import vertexai

        # Initialize Vertex AI
        vertexai.init(
            project=os.getenv("GCP_PROJECT_ID"),
            location=os.getenv("GCP_LOCATION", "us-central1")
        )

        # 1. Retrieve relevant context using RAG
        context_chunks = await production_rag_engine.semantic_search(
            query=request.message,
            course_id=request.course_id,
            top_k=3
        )

        # 2. Build prompt with context
        context_text = "\n\n".join([
            f"Source: {chunk['document_name']}\n{chunk['chunk_text']}"
            for chunk in context_chunks
        ])

        prompt = f"""You are Nova, an intelligent AI tutor. Use the following context from course materials to answer the student's question accurately and helpfully.

Context from course materials:
{context_text}

Student's question: {request.message}

Instructions:
- Answer based on the provided context
- If the context doesn't contain relevant information, say so politely
- Be encouraging and supportive
- Provide clear explanations with examples when possible
- Cite sources when referencing specific materials

Your response:"""

        # 3. Generate response with Gemini
        model = GenerativeModel("gemini-1.5-pro")
        response = model.generate_content(prompt)

        # 4. Format response
        return ChatResponse(
            response=response.text,
            sources=[{
                "document_name": chunk["document_name"],
                "chunk_text": chunk["chunk_text"][:200] + "...",
                "similarity_score": chunk["similarity_score"]
            } for chunk in context_chunks]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")

@router.get("/health")
async def rag_health():
    """Health check for RAG engine"""
    return {
        "status": "healthy",
        "engine": "production_rag_engine",
        "embedding_model": production_rag_engine.embedding_model
    }

