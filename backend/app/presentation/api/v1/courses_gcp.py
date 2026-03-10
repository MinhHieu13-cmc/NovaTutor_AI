import os
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from google.cloud import firestore, storage
import asyncpg
from app.core.config import settings

router = APIRouter(prefix="/courses", tags=["courses"])

# Initialize GCP clients
db_firestore = firestore.Client()
storage_client = storage.Client()

# Database connection pool
_DATABASE_URL_RAW = os.getenv("DATABASE_URL", "")
DATABASE_URL = _DATABASE_URL_RAW.replace("postgresql+asyncpg://", "postgresql://") if _DATABASE_URL_RAW else None

# ============= Pydantic Models =============

class CourseCreate(BaseModel):
    name: str
    description: str
    subject: str

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    voice_config: Optional[dict] = None

class CourseResponse(BaseModel):
    id: str
    teacher_id: str
    name: str
    description: str
    subject: str
    voice_config: dict
    created_at: str

class VoiceConfig(BaseModel):
    voice_name: str
    language: str
    speed: float = 1.0
    pitch: float = 1.0

# ============= Helper Functions =============

async def get_db():
    """Get database connection"""
    conn = None
    try:
        if not DATABASE_URL:
            raise HTTPException(status_code=500, detail="DATABASE_URL is not configured")
        conn = await asyncpg.connect(DATABASE_URL)
        yield conn
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")
    finally:
        if conn:
            await conn.close()

async def verify_teacher_ownership(course_id: str, teacher_id: str, conn):
    """Verify that teacher owns the course"""
    course = await conn.fetchrow(
        "SELECT teacher_id FROM courses WHERE id = $1",
        course_id
    )
    if not course or course['teacher_id'] != teacher_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

# ============= Teacher Routes =============

@router.post("/create", response_model=CourseResponse)
async def create_course(course_data: CourseCreate, teacher_id: str, conn = Depends(get_db)):
    """
    Giảng viên tạo khóa học mới
    """
    try:
        import json
        course_id = str(datetime.utcnow().timestamp())
        created_at_dt = datetime.utcnow()
        created_at_str = created_at_dt.isoformat()
        voice_config = {"voice_name": "Zephyr", "language": "en", "speed": 1.0, "pitch": 1.0}

        # Insert into Cloud SQL PostgreSQL - use datetime object for TIMESTAMP
        await conn.execute(
            """
            INSERT INTO courses (id, teacher_id, name, description, subject, voice_config, created_at)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
            """,
            course_id, teacher_id, course_data.name, course_data.description,
            course_data.subject, json.dumps(voice_config), created_at_dt
        )

        # Also store in Firestore for faster queries
        db_firestore.collection("courses").document(course_id).set({
            "id": course_id,
            "teacher_id": teacher_id,
            "name": course_data.name,
            "description": course_data.description,
            "subject": course_data.subject,
            "voice_config": voice_config,
            "created_at": created_at_str,
            "students_count": 0
        })

        return CourseResponse(
            id=course_id,
            teacher_id=teacher_id,
            name=course_data.name,
            description=course_data.description,
            subject=course_data.subject,
            voice_config=voice_config,
            created_at=created_at_str
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create course: {str(e)}")

@router.get("/my-courses")
async def get_teacher_courses(teacher_id: str, conn = Depends(get_db)):
    """
    Lấy danh sách khóa học của giảng viên
    """
    try:
        courses = await conn.fetch(
            "SELECT * FROM courses WHERE teacher_id = $1 ORDER BY created_at DESC",
            teacher_id
        )
        return [dict(course) for course in courses]

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch courses: {str(e)}")

@router.put("/{course_id}")
async def update_course(course_id: str, course_update: CourseUpdate, teacher_id: str, conn = Depends(get_db)):
    """
    Giảng viên chỉnh sửa thông tin khóa học
    """
    try:
        # Verify ownership
        await verify_teacher_ownership(course_id, teacher_id, conn)

        # Build update query
        update_fields = []
        update_values = []
        param_count = 1

        if course_update.name:
            update_fields.append(f"name = ${param_count}")
            update_values.append(course_update.name)
            param_count += 1

        if course_update.description:
            update_fields.append(f"description = ${param_count}")
            update_values.append(course_update.description)
            param_count += 1

        if course_update.voice_config:
            update_fields.append(f"voice_config = ${param_count}")
            update_values.append(course_update.voice_config)
            param_count += 1

        if not update_fields:
            return {"message": "No fields to update"}

        update_fields.append(f"updated_at = ${param_count}")
        update_values.append(datetime.utcnow().isoformat())
        param_count += 1
        update_values.append(course_id)

        query = f"UPDATE courses SET {', '.join(update_fields)} WHERE id = ${param_count} RETURNING *"
        course = await conn.fetchrow(query, *update_values)

        # Update Firestore
        db_firestore.collection("courses").document(course_id).update(dict(course))

        return dict(course)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update course: {str(e)}")

@router.delete("/{course_id}")
async def delete_course(course_id: str, teacher_id: str, conn = Depends(get_db)):
    """
    Giảng viên xóa khóa học
    """
    try:
        # Verify ownership
        await verify_teacher_ownership(course_id, teacher_id, conn)

        await conn.execute("DELETE FROM courses WHERE id = $1", course_id)

        # Delete from Firestore
        db_firestore.collection("courses").document(course_id).delete()

        return {"message": "Course deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete course: {str(e)}")

@router.post("/{course_id}/upload-document")
async def upload_document(course_id: str, file: UploadFile = File(...), teacher_id: str = "", conn = Depends(get_db)):
    """
    Giảng viên upload tài liệu PDF cho khóa học
    Automatically triggers RAG processing for document embeddings
    """
    try:
        # Verify course ownership
        await verify_teacher_ownership(course_id, teacher_id, conn)

        # Upload to Cloud Storage
        bucket = storage_client.bucket(os.getenv("GCS_BUCKET_NAME", "novatutor-documents"))
        file_content = await file.read()
        blob_path = f"courses/{course_id}/{file.filename}"
        blob = bucket.blob(blob_path)
        blob.upload_from_string(file_content)

        # Get public URL
        public_url = blob.public_url

        # Save record to Cloud SQL
        doc_id = str(datetime.utcnow().timestamp())
        uploaded_at_dt = datetime.utcnow()
        uploaded_at_str = uploaded_at_dt.isoformat()

        await conn.execute(
            """
            INSERT INTO course_documents (id, course_id, document_url, document_name, document_type, uploaded_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            """,
            doc_id, course_id, public_url, file.filename, file.filename.split(".")[-1],
            uploaded_at_dt
        )

        # Also store in Firestore for faster retrieval
        db_firestore.collection("course_documents").document(doc_id).set({
            "id": doc_id,
            "course_id": course_id,
            "document_url": public_url,
            "document_name": file.filename,
            "document_type": file.filename.split(".")[-1],
            "uploaded_at": uploaded_at_str
        })

        # Trigger RAG processing in background
        try:
            from app.application.services.rag_production import production_rag_engine
            chunks_created = await production_rag_engine.process_document(
                document_id=doc_id,
                document_url=public_url,
                course_id=course_id
            )
            rag_status = f"Processed {chunks_created} chunks"
        except Exception as rag_error:
            print(f"RAG processing failed: {str(rag_error)}")
            rag_status = "Uploaded but RAG processing pending"

        return {
            "message": "Document uploaded successfully",
            "document": {
                "id": doc_id,
                "course_id": course_id,
                "document_url": public_url,
                "document_name": file.filename
            },
            "rag_status": rag_status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upload document: {str(e)}")

@router.post("/{course_id}/configure-voice")
async def configure_voice(course_id: str, voice_config: VoiceConfig, teacher_id: str, conn = Depends(get_db)):
    """
    Giảng viên cấu hình AI voice cho khóa học
    """
    try:
        # Verify ownership
        await verify_teacher_ownership(course_id, teacher_id, conn)

        config_dict = voice_config.dict()

        await conn.execute(
            "UPDATE courses SET voice_config = $1, updated_at = $2 WHERE id = $3",
            config_dict, datetime.utcnow().isoformat(), course_id
        )

        # Update Firestore
        db_firestore.collection("courses").document(course_id).update({
            "voice_config": config_dict,
            "updated_at": datetime.utcnow().isoformat()
        })

        return {"message": "Voice configuration updated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to configure voice: {str(e)}")

# ============= Student Routes =============

@router.get("/available")
async def get_available_courses(conn = Depends(get_db)):
    """
    Học sinh lấy danh sách khóa học có sẵn
    """
    try:
        courses = await conn.fetch("SELECT * FROM courses ORDER BY created_at DESC")
        return [dict(course) for course in courses]

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch courses: {str(e)}")

@router.post("/{course_id}/enroll")
async def enroll_course(course_id: str, student_id: str, conn = Depends(get_db)):
    """
    Học sinh tham gia khóa học
    """
    try:
        # Check if already enrolled
        existing = await conn.fetchrow(
            "SELECT * FROM enrollments WHERE course_id = $1 AND student_id = $2",
            course_id, student_id
        )

        if existing:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")

        enrollment_id = str(datetime.utcnow().timestamp())
        joined_at_dt = datetime.utcnow()
        joined_at_str = joined_at_dt.isoformat()

        await conn.execute(
            """
            INSERT INTO enrollments (id, student_id, course_id, joined_at)
            VALUES ($1, $2, $3, $4)
            """,
            enrollment_id, student_id, course_id, joined_at_dt
        )

        # Update Firestore
        db_firestore.collection("enrollments").document(enrollment_id).set({
            "id": enrollment_id,
            "student_id": student_id,
            "course_id": course_id,
            "joined_at": joined_at_str
        })

        return {"message": "Successfully enrolled", "enrollment_id": enrollment_id}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to enroll: {str(e)}")

@router.get("/my-courses-student")
async def get_student_courses(student_id: str, conn = Depends(get_db)):
    """
    Học sinh lấy danh sách khóa học đã tham gia
    """
    try:
        # Get enrollments
        enrollments = await conn.fetch(
            "SELECT course_id FROM enrollments WHERE student_id = $1",
            student_id
        )

        if not enrollments:
            return []

        course_ids = [e['course_id'] for e in enrollments]

        # Get course details
        placeholders = ",".join(f"${i}" for i in range(1, len(course_ids) + 1))
        courses = await conn.fetch(
            f"SELECT * FROM courses WHERE id IN ({placeholders})",
            *course_ids
        )

        return [dict(course) for course in courses]

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch courses: {str(e)}")

@router.get("/{course_id}/documents")
async def get_course_documents(course_id: str, conn = Depends(get_db)):
    """
    Lấy danh sách tài liệu của khóa học
    """
    try:
        documents = await conn.fetch(
            "SELECT * FROM course_documents WHERE course_id = $1 ORDER BY uploaded_at DESC",
            course_id
        )
        return [dict(doc) for doc in documents]

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch documents: {str(e)}")
