import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
import supabase
from app.core.config import settings

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_ANON_KEY", "")
supabase_client = supabase.create_client(supabase_url, supabase_key)

router = APIRouter(prefix="/auth", tags=["auth"])

# ============= Pydantic Models =============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # "student" or "teacher"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    created_at: str

class GoogleAuthRequest(BaseModel):
    id_token: str  # Token từ Google Login

# ============= Auth Routes =============

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserRegister):
    """
    Đăng ký user mới với role (student/teacher)
    """
    try:
        # Tạo user qua Supabase Auth
        auth_response = supabase_client.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })

        user_id = auth_response.user.id

        # Lưu profile vào database
        profile_data = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "created_at": "now()"
        }

        db_response = supabase_client.table("users").insert(profile_data).execute()

        return UserResponse(
            id=user_id,
            email=user_data.email,
            full_name=user_data.full_name,
            role=user_data.role,
            created_at=db_response.data[0]["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=UserResponse)
async def login(credentials: UserLogin):
    """
    Đăng nhập bằng email & password
    """
    try:
        # Authenticate với Supabase
        auth_response = supabase_client.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })

        user_id = auth_response.user.id

        # Lấy profile từ database
        user_profile = supabase_client.table("users").select("*").eq("id", user_id).execute()

        if not user_profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")

        user_data = user_profile.data[0]
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            created_at=user_data["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    """
    Google OAuth Sign-in / Sign-up
    Token từ frontend (từ react-google-login hoặc @react-oauth/google)
    """
    try:
        # Xác minh ID token với Supabase (hoặc Google)
        auth_response = supabase_client.auth.sign_in_with_id_token(
            provider="google",
            id_token=request.id_token
        )

        user_id = auth_response.user.id
        email = auth_response.user.email

        # Kiểm tra user đã tồn tại chưa
        existing_user = supabase_client.table("users").select("*").eq("id", user_id).execute()

        if not existing_user.data:
            # Tạo user mới (mặc định là student)
            profile_data = {
                "id": user_id,
                "email": email,
                "full_name": auth_response.user.user_metadata.get("full_name", email.split("@")[0]),
                "role": "student",  # Default role
                "created_at": "now()"
            }
            supabase_client.table("users").insert(profile_data).execute()

        user_profile = supabase_client.table("users").select("*").eq("id", user_id).execute()
        user_data = user_profile.data[0]

        return {
            "access_token": auth_response.session.access_token,
            "user": UserResponse(
                id=user_data["id"],
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                created_at=user_data["created_at"]
            )
        }

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google auth failed: {str(e)}")

@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: Optional[str] = None):
    """
    Lấy thông tin user hiện tại
    """
    try:
        # Extract token từ header
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid token")

        token = authorization.split("Bearer ")[1]

        # Verify token với Supabase
        user = supabase_client.auth.get_user(token)

        # Lấy profile từ database
        user_profile = supabase_client.table("users").select("*").eq("id", user.id).execute()

        if not user_profile.data:
            raise HTTPException(status_code=404, detail="User profile not found")

        user_data = user_profile.data[0]
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            created_at=user_data["created_at"]
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail="Unauthorized")

@router.post("/logout")
async def logout():
    """
    Đăng xuất (thực hiện ở frontend bằng cách xóa token)
    """
    return {"message": "Logout successful"}

