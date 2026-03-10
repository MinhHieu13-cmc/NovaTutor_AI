import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
import supabase
from app.core.config import settings

supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "")
supabase_client = supabase.create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/courses", tags=["courses"])

# ============= Pydantic Models =============

class CourseCreate(BaseModel):
    name: str
    description: str
    subject: str  # "Math", "English", "Science", etc.

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    voice_config: Optional[dict] = None  # {"voice_name": "Zephyr", "language": "en"}

class CourseResponse(BaseModel):
    id: str
    teacher_id: str
    name: str
    description: str
    subject: str
    voice_config: dict
    created_at: str

class DocumentUpload(BaseModel):
    course_id: str
    document_type: str  # "pdf", "docx", "txt"

class VoiceConfig(BaseModel):
    voice_name: str  # "Zephyr", "Phoebe", etc.
    language: str  # "en", "vi", "zh", etc.
    speed: float = 1.0  # 0.5 - 2.0
    pitch: float = 1.0  # 0.5 - 2.0

# ============= Teacher Routes =============

@router.post("/create", response_model=CourseResponse)
async def create_course(course_data: CourseCreate, teacher_id: str):
    """
    Giảng viên tạo khóa học mới
    """
    try:
        new_course = {
            "teacher_id": teacher_id,
            "name": course_data.name,
            "description": course_data.description,
            "subject": course_data.subject,
            "voice_config": {"voice_name": "Zephyr", "language": "en"},
            "created_at": "now()"
        }

        response = supabase_client.table("courses").insert(new_course).execute()
        course = response.data[0]

        return CourseResponse(
            id=course["id"],
            teacher_id=course["teacher_id"],
            name=course["name"],
            description=course["description"],
            subject=course["subject"],
            voice_config=course["voice_config"],
            created_at=course["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create course: {str(e)}")

@router.get("/my-courses")
async def get_teacher_courses(teacher_id: str):
    """
    Lấy danh sách khóa học của giảng viên
    """
    try:
        response = supabase_client.table("courses").select("*").eq("teacher_id", teacher_id).execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch courses: {str(e)}")

@router.put("/{course_id}")
async def update_course(course_id: str, course_update: CourseUpdate, teacher_id: str):
    """
    Giảng viên chỉnh sửa thông tin khóa học
    """
    try:
        # Verify ownership
        course = supabase_client.table("courses").select("*").eq("id", course_id).execute()
        if not course.data or course.data[0]["teacher_id"] != teacher_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        update_data = course_update.dict(exclude_unset=True)
        response = supabase_client.table("courses").update(update_data).eq("id", course_id).execute()

        return response.data[0]

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update course: {str(e)}")

@router.delete("/{course_id}")
async def delete_course(course_id: str, teacher_id: str):
    """
    Giảng viên xóa khóa học
    """
    try:
        # Verify ownership
        course = supabase_client.table("courses").select("*").eq("id", course_id).execute()
        if not course.data or course.data[0]["teacher_id"] != teacher_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        supabase_client.table("courses").delete().eq("id", course_id).execute()

        return {"message": "Course deleted successfully"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete course: {str(e)}")

@router.post("/{course_id}/upload-document")
async def upload_document(course_id: str, file: UploadFile = File(...), teacher_id: str = ""):
    """
    Giảng viên upload tài liệu PDF cho khóa học
    """
    try:
        # Verify course ownership
        course = supabase_client.table("courses").select("*").eq("id", course_id).execute()
        if not course.data or course.data[0]["teacher_id"] != teacher_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        # Upload file to Supabase Storage
        file_content = await file.read()
        file_path = f"courses/{course_id}/{file.filename}"

        supabase_client.storage.from_("course-documents").upload(file_path, file_content)

        # Get public URL
        public_url = supabase_client.storage.from_("course-documents").get_public_url(file_path)

        # Save document record
        doc_record = {
            "course_id": course_id,
            "document_url": public_url,
            "document_name": file.filename,
            "document_type": file.filename.split(".")[-1],
            "uploaded_at": "now()"
        }

        response = supabase_client.table("course_documents").insert(doc_record).execute()

        return {
            "message": "Document uploaded successfully",
            "document": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upload document: {str(e)}")

@router.post("/{course_id}/configure-voice")
async def configure_voice(course_id: str, voice_config: VoiceConfig, teacher_id: str):
    """
    Giảng viên cấu hình AI voice cho khóa học
    """
    try:
        # Verify course ownership
        course = supabase_client.table("courses").select("*").eq("id", course_id).execute()
        if not course.data or course.data[0]["teacher_id"] != teacher_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        config_dict = voice_config.dict()
        update_data = {"voice_config": config_dict}

        response = supabase_client.table("courses").update(update_data).eq("id", course_id).execute()

        return {
            "message": "Voice configuration updated",
            "course": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to configure voice: {str(e)}")

# ============= Student Routes =============

@router.get("/available")
async def get_available_courses():
    """
    Học sinh lấy danh sách khóa học có sẵn
    """
    try:
        response = supabase_client.table("courses").select("*").execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch courses: {str(e)}")

@router.post("/{course_id}/enroll")
async def enroll_course(course_id: str, student_id: str):
    """
    Học sinh tham gia khóa học
    """
    try:
        # Check if already enrolled
        existing = supabase_client.table("enrollments").select("*").eq("course_id", course_id).eq("student_id", student_id).execute()

        if existing.data:
            raise HTTPException(status_code=400, detail="Already enrolled in this course")

        enrollment = {
            "student_id": student_id,
            "course_id": course_id,
            "joined_at": "now()"
        }

        response = supabase_client.table("enrollments").insert(enrollment).execute()

        return {
            "message": "Successfully enrolled",
            "enrollment": response.data[0]
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to enroll: {str(e)}")

@router.get("/my-courses-student")
async def get_student_courses(student_id: str):
    """
    Học sinh lấy danh sách khóa học đã tham gia
    """
    try:
        # Get enrollments
        enrollments = supabase_client.table("enrollments").select("course_id").eq("student_id", student_id).execute()

        if not enrollments.data:
            return []

        course_ids = [e["course_id"] for e in enrollments.data]

        # Get course details
        courses = supabase_client.table("courses").select("*").in_("id", course_ids).execute()

        return courses.data

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch courses: {str(e)}")

@router.get("/{course_id}/documents")
async def get_course_documents(course_id: str):
    """
    Lấy danh sách tài liệu của khóa học
    """
    try:
        response = supabase_client.table("course_documents").select("*").eq("course_id", course_id).execute()
        return response.data

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch documents: {str(e)}")

