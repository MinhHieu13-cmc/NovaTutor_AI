from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from app.domain.repositories.interfaces import IStudentRepository
from app.domain.models.core import Student as StudentModel
from app.infrastructure.database.models import Student

class CloudSQLStudentRepository(IStudentRepository):
    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    async def get_by_id(self, student_id: str) -> Optional[StudentModel]:
        async with AsyncSession() as session:
            result = await session.execute(
                select(Student).where(Student.id == student_id)
            )
            db_student = result.scalar_one_or_none()
            if db_student:
                return StudentModel(
                    id=db_student.id,
                    email=db_student.email,
                    name=db_student.name,
                    grade_level=db_student.grade_level,
                    learning_style=db_student.learning_style,
                    strengths=db_student.strengths or [],
                    weaknesses=db_student.weaknesses or [],
                    preferences=db_student.preferences or {},
                    created_at=db_student.created_at,
                    updated_at=db_student.updated_at
                )
            return None

    async def create(self, student: StudentModel) -> StudentModel:
        async with AsyncSession() as session:
            db_student = Student(
                id=student.id,
                email=student.email,
                name=student.name,
                grade_level=student.grade_level,
                learning_style=student.learning_style,
                strengths=student.strengths,
                weaknesses=student.weaknesses,
                preferences=student.preferences
            )
            session.add(db_student)
            await session.commit()
            await session.refresh(db_student)
            return student

    async def update_profile(self, student_id: str, updates: Dict[str, Any]) -> bool:
        async with AsyncSession() as session:
            result = await session.execute(
                update(Student)
                .where(Student.id == student_id)
                .values(**updates)
            )
            await session.commit()
            return result.rowcount > 0

    async def get_all(self) -> List[StudentModel]:
        async with AsyncSession() as session:
            result = await session.execute(select(Student))
            db_students = result.scalars().all()
            return [
                StudentModel(
                    id=db_student.id,
                    email=db_student.email,
                    name=db_student.name,
                    grade_level=db_student.grade_level,
                    learning_style=db_student.learning_style,
                    strengths=db_student.strengths or [],
                    weaknesses=db_student.weaknesses or [],
                    preferences=db_student.preferences or {},
                    created_at=db_student.created_at,
                    updated_at=db_student.updated_at
                )
                for db_student in db_students
            ]
