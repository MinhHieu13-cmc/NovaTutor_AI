"""
RAG & Chat API Endpoints
Handles document processing, semantic search, conversation persistence, and AI-powered chat
"""
import json
import os
import urllib.error
import urllib.request
from typing import Optional, List, Literal
from uuid import uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Path
from pydantic import BaseModel

from app.application.services.rag_production import production_rag_engine
from app.presentation.api.v1.auth_gcp import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/rag", tags=["rag"])

# Database URL for conversation persistence
_DATABASE_URL_RAW = os.getenv("DATABASE_URL", "")
DATABASE_URL = _DATABASE_URL_RAW.replace("postgresql+asyncpg://", "postgresql://") if _DATABASE_URL_RAW else None


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
    session_id: Optional[str] = None
    conversation_history: List[dict] = []


class ChatResponse(BaseModel):
    response: str
    sources: List[dict]
    conversation_id: Optional[str] = None


class ConversationMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class SaveConversationRequest(BaseModel):
    course_id: Optional[str] = None
    session_id: Optional[str] = None
    messages: List[ConversationMessage]


class ConversationSessionCreateRequest(BaseModel):
    title: str
    course_id: Optional[str] = None


class ConversationSessionResponse(BaseModel):
    id: str
    title: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    message_count: Optional[int] = None


class ConversationSessionListResponse(BaseModel):
    sessions: List[ConversationSessionResponse]


class LoadConversationResponse(BaseModel):
    messages: List[dict]
    total: int


async def _get_db_conn() -> asyncpg.Connection:
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured for conversation persistence")
    try:
        return await asyncpg.connect(DATABASE_URL)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {exc}")


async def _ensure_chat_history_table(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ai_lab_sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    await conn.execute(
        """
        CREATE TABLE IF NOT EXISTS chat_history (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
            session_id TEXT,
            message TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
            emotion TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    await conn.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id TEXT")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_lab_sessions_student_id ON ai_lab_sessions(student_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_ai_lab_sessions_course_id ON ai_lab_sessions(course_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_student_id ON chat_history(student_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_course_id ON chat_history(course_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id)")
    await conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at)")


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Depends(get_current_user)
):
    """Process a document (teacher only): extract text, chunk, embed, store."""
    try:
        chunks_created = await production_rag_engine.process_document(
            document_id=request.document_id,
            document_url=request.document_url,
            course_id=request.course_id,
        )

        return ProcessDocumentResponse(
            message="Document processed successfully",
            document_id=request.document_id,
            chunks_created=chunks_created,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.post("/search")
async def semantic_search(
    request: SemanticSearchRequest,
    authorization: Optional[str] = Depends(get_current_user)
):
    """Perform semantic search over course documents."""
    try:
        results = await production_rag_engine.semantic_search(
            query=request.query,
            course_id=request.course_id,
            top_k=request.top_k,
        )

        return {
            "query": request.query,
            "results": results,
            "total_results": len(results),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/conversation/sessions", response_model=ConversationSessionResponse)
async def create_conversation_session(
    request: ConversationSessionCreateRequest,
    authorization: Optional[dict] = Depends(get_current_user),
):
    user_id = authorization.get("id") if isinstance(authorization, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    title = request.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="Session title is required")

    conn = await _get_db_conn()
    try:
        await _ensure_chat_history_table(conn)
        session_id = str(uuid4())
        row = await conn.fetchrow(
            """
            INSERT INTO ai_lab_sessions (id, student_id, course_id, title)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, created_at, updated_at
            """,
            session_id,
            user_id,
            request.course_id,
            title,
        )
        return ConversationSessionResponse(
            id=row["id"],
            title=row["title"],
            created_at=row["created_at"].isoformat() if row["created_at"] else None,
            updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
            message_count=0,
        )
    finally:
        await conn.close()


@router.get("/conversation/sessions", response_model=ConversationSessionListResponse)
async def list_conversation_sessions(
    course_id: Optional[str] = Query(default=None),
    authorization: Optional[dict] = Depends(get_current_user),
):
    user_id = authorization.get("id") if isinstance(authorization, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    conn = await _get_db_conn()
    try:
        await _ensure_chat_history_table(conn)
        if course_id:
            rows = await conn.fetch(
                """
                SELECT s.id, s.title, s.created_at, s.updated_at,
                       COALESCE(COUNT(h.id), 0) AS message_count
                FROM ai_lab_sessions s
                LEFT JOIN chat_history h ON h.session_id = s.id
                WHERE s.student_id=$1 AND s.course_id=$2
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                """,
                user_id,
                course_id,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT s.id, s.title, s.created_at, s.updated_at,
                       COALESCE(COUNT(h.id), 0) AS message_count
                FROM ai_lab_sessions s
                LEFT JOIN chat_history h ON h.session_id = s.id
                WHERE s.student_id=$1 AND s.course_id IS NULL
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                """,
                user_id,
            )

        sessions = [
            ConversationSessionResponse(
                id=row["id"],
                title=row["title"],
                created_at=row["created_at"].isoformat() if row["created_at"] else None,
                updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
                message_count=int(row["message_count"] or 0),
            )
            for row in rows
        ]
        return ConversationSessionListResponse(sessions=sessions)
    finally:
        await conn.close()


@router.delete("/conversation/sessions/{session_id}")
async def delete_conversation_session(
    session_id: str = Path(...),
    authorization: Optional[dict] = Depends(get_current_user),
):
    user_id = authorization.get("id") if isinstance(authorization, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    conn = await _get_db_conn()
    try:
        await _ensure_chat_history_table(conn)
        await conn.execute("DELETE FROM chat_history WHERE student_id=$1 AND session_id=$2", user_id, session_id)
        result = await conn.execute("DELETE FROM ai_lab_sessions WHERE id=$1 AND student_id=$2", session_id, user_id)
        deleted = result.endswith("1")
        return {"deleted": deleted}
    finally:
        await conn.close()


@router.post("/conversation/save")
async def save_conversation(
    request: SaveConversationRequest,
    authorization: Optional[dict] = Depends(get_current_user)
):
    """Persist latest conversation for resume (backend method)."""
    user_id = authorization.get("id") if isinstance(authorization, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    conn = await _get_db_conn()
    try:
        await _ensure_chat_history_table(conn)

        # Keep only valid chat roles and trim to last 80 messages
        valid_messages = [m for m in request.messages if m.role in ("user", "assistant") and m.content.strip()]
        valid_messages = valid_messages[-80:]

        if request.session_id:
            await conn.execute(
                "DELETE FROM chat_history WHERE student_id=$1 AND session_id=$2",
                user_id,
                request.session_id,
            )
            await conn.execute(
                "UPDATE ai_lab_sessions SET updated_at=NOW() WHERE id=$1 AND student_id=$2",
                request.session_id,
                user_id,
            )
        elif request.course_id:
            await conn.execute(
                "DELETE FROM chat_history WHERE student_id=$1 AND course_id=$2 AND session_id IS NULL",
                user_id,
                request.course_id,
            )
        else:
            await conn.execute(
                "DELETE FROM chat_history WHERE student_id=$1 AND course_id IS NULL AND session_id IS NULL",
                user_id,
            )

        for msg in valid_messages:
            await conn.execute(
                """
                INSERT INTO chat_history (id, student_id, course_id, session_id, message, role)
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                str(uuid4()),
                user_id,
                request.course_id,
                request.session_id,
                msg.content,
                msg.role,
            )

        return {"saved_count": len(valid_messages)}
    finally:
        await conn.close()


@router.get("/conversation/load", response_model=LoadConversationResponse)
async def load_conversation(
    course_id: Optional[str] = Query(default=None),
    session_id: Optional[str] = Query(default=None),
    limit: int = Query(default=60, ge=1, le=200),
    authorization: Optional[dict] = Depends(get_current_user),
):
    """Load latest conversation for resume (backend method)."""
    user_id = authorization.get("id") if isinstance(authorization, dict) else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    conn = await _get_db_conn()
    try:
        await _ensure_chat_history_table(conn)

        if session_id:
            rows = await conn.fetch(
                """
                SELECT role, message, created_at
                FROM chat_history
                WHERE student_id=$1 AND session_id=$2
                ORDER BY created_at DESC
                LIMIT $3
                """,
                user_id,
                session_id,
                limit,
            )
        elif course_id:
            rows = await conn.fetch(
                """
                SELECT role, message, created_at
                FROM chat_history
                WHERE student_id=$1 AND course_id=$2 AND session_id IS NULL
                ORDER BY created_at DESC
                LIMIT $3
                """,
                user_id,
                course_id,
                limit,
            )
        else:
            rows = await conn.fetch(
                """
                SELECT role, message, created_at
                FROM chat_history
                WHERE student_id=$1 AND course_id IS NULL AND session_id IS NULL
                ORDER BY created_at DESC
                LIMIT $2
                """,
                user_id,
                limit,
            )

        ordered = list(reversed(rows))
        messages = [
            {
                "role": row["role"],
                "content": row["message"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None,
            }
            for row in ordered
        ]

        return LoadConversationResponse(messages=messages, total=len(messages))
    finally:
        await conn.close()


def _get_runtime_gemini_key() -> str | None:
    return settings.GEMINI_API_KEY or settings.GOOGLE_API_KEY


def _extract_text_from_gemini_response(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    if not candidates:
        return ""

    parts = candidates[0].get("content", {}).get("parts", [])
    texts = [part.get("text", "") for part in parts if part.get("text")]
    return "\n".join(texts).strip()


async def _best_effort_context(query: str, course_id: Optional[str]) -> List[dict]:
    if not course_id:
        return []

    try:
        return await production_rag_engine.semantic_search(
            query=query,
            course_id=course_id,
            top_k=3,
        )
    except Exception:
        return []


@router.post("/chat", response_model=ChatResponse)
async def chat_with_tutor(
    request: ChatRequest,
    authorization: Optional[str] = Depends(get_current_user)
):
    """
    Chat with AI tutor using RAG context when available.
    Local mode uses Gemini API key instead of ADC-dependent Vertex auth.
    """
    try:
        api_key = _get_runtime_gemini_key()
        if not api_key:
            raise HTTPException(status_code=503, detail="Gemini API key is not configured on backend")

        context_chunks = await _best_effort_context(
            query=request.message,
            course_id=request.course_id,
        )

        context_text = "\n\n".join([
            f"Source: {chunk['document_name']}\n{chunk['chunk_text']}"
            for chunk in context_chunks
        ])

        history_text = "\n".join([
            f"{item.get('role', 'user')}: {item.get('content', '')}"
            for item in request.conversation_history[-8:]
        ])

        prompt = f"""You are Nova, an intelligent AI tutor for students.

Conversation history:
{history_text or 'No previous conversation.'}

Course context:
{context_text or 'No verified course source was available, answer using general educational guidance.'}

Student message: {request.message}

## Formatting rules (MUST follow strictly):
- Always respond in **Markdown** format.
- Use `##` or `###` headings when the answer has multiple sections.
- Use `-` bullet lists for enumerations, steps, or comparisons.
- Use **bold** for key terms and `inline code` for formulas, code, or variable names.
- Use fenced code blocks (triple backtick) for any code examples.
- Add a **blank line between every paragraph** — never collapse multiple ideas into one wall of text.
- If the answer has sequential steps, number them: `1.`, `2.`, `3.`
- If course context is available, cite the source naturally inline.
- End with a short encouraging sentence when appropriate.
"""

        request_body = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1024,
            },
        }

        gemini_model = "gemini-2.5-flash"
        http_request = urllib.request.Request(
            url=f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}",
            data=json.dumps(request_body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(http_request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as http_error:
            detail = http_error.read().decode("utf-8", errors="ignore")
            raise HTTPException(status_code=502, detail=f"Gemini API call failed: {detail}")

        response_text = _extract_text_from_gemini_response(payload)
        if not response_text:
            raise HTTPException(status_code=502, detail="Gemini API returned an empty response")

        return ChatResponse(
            response=response_text,
            sources=[
                {
                    "document_name": chunk["document_name"],
                    "chunk_text": chunk["chunk_text"][:200] + "...",
                    "similarity_score": chunk["similarity_score"],
                }
                for chunk in context_chunks
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.get("/health")
async def rag_health():
    """Health check for RAG engine"""
    return {
        "status": "healthy",
        "engine": "production_rag_engine",
        "embedding_model": production_rag_engine.embedding_model,
    }
