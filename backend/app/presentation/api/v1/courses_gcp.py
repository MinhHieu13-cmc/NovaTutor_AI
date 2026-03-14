"""
Courses API — Dual-mode: PostgreSQL (local) + Firestore mirror (GCP production)
"""
import os
import json
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
import asyncpg

router = APIRouter(prefix="/courses", tags=["courses"])

# ─── Firestore (optional — GCP production only) ───────────────────────────────
_firestore_client = None
try:
    from google.cloud import firestore as _fs
    _firestore_client = _fs.Client()
except Exception:
    pass

# ─── Cloud Storage (optional — GCP production only) ───────────────────────────
_storage_client = None
try:
    from google.cloud import storage as _gcs
    _storage_client = _gcs.Client()
except Exception:
    pass

# ─── Database URL ─────────────────────────────────────────────────────────────
_RAW = os.getenv("DATABASE_URL", "")
DATABASE_URL = _RAW.replace("postgresql+asyncpg://", "postgresql://") if _RAW else None

# ─── Pydantic Models ──────────────────────────────────────────────────────────

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

# ─── Helpers ──────────────────────────────────────────────────────────────────

async def get_db():
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured.")
    conn = None
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        yield conn
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB connection failed: {e}")
    finally:
        if conn:
            await conn.close()

async def _verify_teacher_ownership(course_id: str, teacher_id: str, conn):
    row = await conn.fetchrow("SELECT teacher_id FROM courses WHERE id = $1", course_id)
    if not row or row["teacher_id"] != teacher_id:
        raise HTTPException(status_code=403, detail="Unauthorized: you don't own this course")

def _row_to_course(row) -> dict:
    d = dict(row)
    # voice_config may come back as str from postgres json column
    if isinstance(d.get("voice_config"), str):
        try:
            d["voice_config"] = json.loads(d["voice_config"])
        except Exception:
            d["voice_config"] = {}
    if d.get("voice_config") is None:
        d["voice_config"] = {}
    d["created_at"] = str(d["created_at"])
    if d.get("updated_at"):
        d["updated_at"] = str(d["updated_at"])
    return d

# ─── Teacher Routes ───────────────────────────────────────────────────────────

@router.post("/create", response_model=CourseResponse)
async def create_course(course_data: CourseCreate, teacher_id: str, conn=Depends(get_db)):
    course_id   = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    created_at  = datetime.now(timezone.utc)
    voice_config = {"voice_name": "Zephyr", "language": "en", "speed": 1.0, "pitch": 1.0}

    try:
        await conn.execute(
            """
            INSERT INTO courses (id, teacher_id, name, description, subject, voice_config, created_at)
            VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
            """,
            course_id, teacher_id, course_data.name, course_data.description,
            course_data.subject, json.dumps(voice_config), created_at,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create course: {e}")

    # Best-effort Firestore mirror
    if _firestore_client:
        try:
            _firestore_client.collection("courses").document(course_id).set({
                "id": course_id, "teacher_id": teacher_id,
                "name": course_data.name, "subject": course_data.subject,
                "created_at": created_at.isoformat(),
            })
        except Exception:
            pass

    return CourseResponse(
        id=course_id, teacher_id=teacher_id,
        name=course_data.name, description=course_data.description,
        subject=course_data.subject, voice_config=voice_config,
        created_at=created_at.isoformat(),
    )


@router.get("/my-courses")
async def get_teacher_courses(teacher_id: str, conn=Depends(get_db)):
    try:
        rows = await conn.fetch(
            "SELECT * FROM courses WHERE teacher_id=$1 ORDER BY created_at DESC", teacher_id
        )
        return [_row_to_course(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{course_id}")
async def update_course(course_id: str, course_update: CourseUpdate, teacher_id: str, conn=Depends(get_db)):
    await _verify_teacher_ownership(course_id, teacher_id, conn)

    fields, vals, idx = [], [], 1
    for attr, col in [("name", "name"), ("description", "description")]:
        v = getattr(course_update, attr)
        if v is not None:
            fields.append(f"{col} = ${idx}"); vals.append(v); idx += 1
    if course_update.voice_config:
        fields.append(f"voice_config = ${idx}::jsonb")
        vals.append(json.dumps(course_update.voice_config)); idx += 1

    if not fields:
        return {"message": "No fields to update"}

    fields.append(f"updated_at = ${idx}"); vals.append(datetime.now(timezone.utc)); idx += 1
    vals.append(course_id)

    try:
        row = await conn.fetchrow(
            f"UPDATE courses SET {', '.join(fields)} WHERE id = ${idx} RETURNING *", *vals
        )
        return _row_to_course(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{course_id}")
async def delete_course(course_id: str, teacher_id: str, conn=Depends(get_db)):
    await _verify_teacher_ownership(course_id, teacher_id, conn)
    try:
        await conn.execute("DELETE FROM courses WHERE id = $1", course_id)
        if _firestore_client:
            try:
                _firestore_client.collection("courses").document(course_id).delete()
            except Exception:
                pass
        return {"message": "Course deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{course_id}/upload-document")
async def upload_document(
    course_id: str, file: UploadFile = File(...),
    teacher_id: str = "", conn=Depends(get_db)
):
    await _verify_teacher_ownership(course_id, teacher_id, conn)

    file_content = await file.read()
    doc_id       = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    uploaded_at  = datetime.now(timezone.utc)

    # Upload to GCS when available; otherwise store local placeholder URL
    if _storage_client:
        try:
            bucket = _storage_client.bucket(os.getenv("GCS_BUCKET_NAME", "novatutor-documents"))
            blob   = bucket.blob(f"courses/{course_id}/{file.filename}")
            blob.upload_from_string(file_content, content_type=file.content_type)
            public_url = blob.public_url
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Cloud Storage not available: {e}")
    else:
        # Local fallback — record without actual file hosting
        public_url = f"local://courses/{course_id}/{file.filename}"

    try:
        await conn.execute(
            """
            INSERT INTO course_documents (id, course_id, document_url, document_name, document_type, uploaded_at)
            VALUES ($1,$2,$3,$4,$5,$6)
            """,
            doc_id, course_id, public_url, file.filename,
            file.filename.rsplit(".", 1)[-1], uploaded_at,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Trigger RAG processing (best-effort)
    rag_status = "Pending RAG processing"
    try:
        from app.application.services.rag_production import production_rag_engine
        chunks = await production_rag_engine.process_document(
            document_id=doc_id, document_url=public_url, course_id=course_id
        )
        rag_status = f"Processed {chunks} chunks"
    except Exception:
        pass

    return {
        "message": "Document uploaded successfully",
        "document": {
            "id": doc_id, "course_id": course_id,
            "document_url": public_url, "document_name": file.filename,
            "uploaded_at": uploaded_at.isoformat(),
        },
        "rag_status": rag_status,
    }


@router.post("/{course_id}/configure-voice")
async def configure_voice(course_id: str, voice_config: VoiceConfig, teacher_id: str, conn=Depends(get_db)):
    await _verify_teacher_ownership(course_id, teacher_id, conn)
    config_dict = voice_config.dict()
    try:
        await conn.execute(
            "UPDATE courses SET voice_config=$1::jsonb, updated_at=$2 WHERE id=$3",
            json.dumps(config_dict), datetime.now(timezone.utc), course_id,
        )
        return {"message": "Voice configuration updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Student Routes ───────────────────────────────────────────────────────────

@router.get("/available")
async def get_available_courses(conn=Depends(get_db)):
    try:
        rows = await conn.fetch("SELECT * FROM courses ORDER BY created_at DESC")
        return [_row_to_course(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{course_id}/enroll")
async def enroll_course(course_id: str, student_id: str, conn=Depends(get_db)):
    existing = await conn.fetchrow(
        "SELECT id FROM enrollments WHERE course_id=$1 AND student_id=$2", course_id, student_id
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")

    enrollment_id = str(datetime.now(timezone.utc).timestamp()).replace(".", "")
    joined_at     = datetime.now(timezone.utc)
    try:
        await conn.execute(
            "INSERT INTO enrollments (id, student_id, course_id, joined_at) VALUES ($1,$2,$3,$4)",
            enrollment_id, student_id, course_id, joined_at,
        )
        return {"message": "Successfully enrolled", "enrollment_id": enrollment_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-courses-student")
async def get_student_courses(student_id: str, conn=Depends(get_db)):
    try:
        enrollments = await conn.fetch(
            "SELECT course_id FROM enrollments WHERE student_id=$1", student_id
        )
        if not enrollments:
            return []
        ids = [e["course_id"] for e in enrollments]
        placeholders = ",".join(f"${i+1}" for i in range(len(ids)))
        rows = await conn.fetch(f"SELECT * FROM courses WHERE id IN ({placeholders})", *ids)
        return [_row_to_course(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{course_id}/documents")
async def get_course_documents(course_id: str, conn=Depends(get_db)):
    try:
        rows = await conn.fetch(
            "SELECT * FROM course_documents WHERE course_id=$1 ORDER BY uploaded_at DESC", course_id
        )
        result = []
        for r in rows:
            d = dict(r)
            d["uploaded_at"] = str(d["uploaded_at"])
            result.append(d)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
