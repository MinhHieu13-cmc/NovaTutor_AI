from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert, update, delete
from app.domain.repositories.interfaces import ISessionRepository
from app.domain.models.core import Session as SessionModel
from app.infrastructure.database.models import Session as DBSession
from app.infrastructure.database.connection import async_session

class CloudSQLSessionRepository(ISessionRepository):
    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    async def create(self, session: SessionModel) -> SessionModel:
        async with async_session() as db_session:
            db_session_obj = DBSession(
                id=session.id,
                student_id=session.student_id,
                subject=session.subject,
                topic=session.topic,
                duration_minutes=session.duration_minutes,
                transcript=session.transcript,
                summary=session.summary,
                learning_outcomes=session.learning_outcomes,
                assessment_score=session.assessment_score
            )
            db_session.add(db_session_obj)
            await db_session.commit()
            await db_session.refresh(db_session_obj)
            return session

    async def get_by_id(self, session_id: str) -> Optional[SessionModel]:
        async with async_session() as db_session:
            result = await db_session.execute(
                select(DBSession).where(DBSession.id == session_id)
            )
            db_session_obj = result.scalar_one_or_none()
            if db_session_obj:
                return SessionModel(
                    id=db_session_obj.id,
                    student_id=db_session_obj.student_id,
                    subject=db_session_obj.subject,
                    topic=db_session_obj.topic,
                    duration_minutes=db_session_obj.duration_minutes,
                    transcript=db_session_obj.transcript,
                    summary=db_session_obj.summary,
                    learning_outcomes=db_session_obj.learning_outcomes or [],
                    assessment_score=db_session_obj.assessment_score,
                    created_at=db_session_obj.created_at
                )
            return None

    async def update(self, session_id: str, updates: Dict[str, Any]) -> bool:
        async with async_session() as db_session:
            result = await db_session.execute(
                update(DBSession)
                .where(DBSession.id == session_id)
                .values(**updates)
            )
            await db_session.commit()
            return result.rowcount > 0

    async def get_by_student(self, student_id: str) -> List[SessionModel]:
        async with async_session() as db_session:
            result = await db_session.execute(
                select(DBSession).where(DBSession.student_id == student_id)
            )
            db_sessions = result.scalars().all()
            return [
                SessionModel(
                    id=db_session.id,
                    student_id=db_session.student_id,
                    subject=db_session.subject,
                    topic=db_session.topic,
                    duration_minutes=db_session.duration_minutes,
                    transcript=db_session.transcript,
                    summary=db_session.summary,
                    learning_outcomes=db_session.learning_outcomes or [],
                    assessment_score=db_session.assessment_score,
                    created_at=db_session.created_at
                )
                for db_session in db_sessions
            ]

    async def delete(self, session_id: str) -> bool:
        async with async_session() as db_session:
            result = await db_session.execute(
                delete(DBSession).where(DBSession.id == session_id)
            )
            await db_session.commit()
            return result.rowcount > 0

    async def save_message(self, session_id: str, message: Dict[str, Any]) -> None:
        # For now, save to conversation_messages table
        from app.infrastructure.database.models import ConversationMessage
        async with async_session() as db_session:
            db_message = ConversationMessage(
                session_id=session_id,
                role=message.get("role"),
                content=message.get("content"),
                metadata=message.get("metadata", {})
            )
            db_session.add(db_message)
            await db_session.commit()

    async def get_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        from app.infrastructure.database.models import ConversationMessage
        async with async_session() as db_session:
            result = await db_session.execute(
                select(ConversationMessage)
                .where(ConversationMessage.session_id == session_id)
                .order_by(ConversationMessage.timestamp.desc())
                .limit(limit)
            )
            messages = result.scalars().all()
            return [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "metadata": msg.metadata
                }
                for msg in reversed(messages)  # Reverse to get chronological order
            ]
