import os
import json
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr
import jwt
from google.cloud import firestore, storage
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from app.core.config import settings
import asyncpg

router = APIRouter(prefix="/auth", tags=["auth"])

# Initialize GCP clients
db_firestore = firestore.Client()  # Firestore for user profiles
storage_client = storage.Client()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Database URL - normalize for asyncpg
_DATABASE_URL_RAW = os.getenv("DATABASE_URL", "")
DATABASE_URL = _DATABASE_URL_RAW.replace("postgresql+asyncpg://", "postgresql://") if _DATABASE_URL_RAW else None

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

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class GoogleAuthRequest(BaseModel):
    id_token: str  # Token từ Google Login

# ============= Helper Functions =============

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Tạo JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    """Verify JWT token và lấy user info từ Firestore"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split("Bearer ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    # Get user from Firestore
    user_doc = db_firestore.collection("users").document(user_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="User not found")

    return user_doc.to_dict()

# ============= Auth Routes =============

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    """
    Đăng ký user mới với role (student/teacher)
    Sử dụng GCP Firestore để lưu user profile
    """
    try:
        # Check if user already exists
        existing_users = db_firestore.collection("users").where("email", "==", user_data.email).stream()
        if list(existing_users):
            raise HTTPException(status_code=400, detail="Email already registered")

        # Generate user ID
        user_id = db_firestore.collection("users").document().id

        # Hash password (in production, use bcrypt)
        import hashlib
        hashed_password = hashlib.sha256(user_data.password.encode()).hexdigest()

        # Create user document in Firestore
        user_profile = {
            "id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "password_hash": hashed_password,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        db_firestore.collection("users").document(user_id).set(user_profile)

        # Mirror user profile into Cloud SQL for FK consistency
        if DATABASE_URL:
            conn = None
            try:
                conn = await asyncpg.connect(DATABASE_URL)
                await conn.execute(
                    """
                    INSERT INTO users (id, email, full_name, role, password_hash, google_id, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    user_id,
                    user_data.email,
                    user_data.full_name,
                    user_data.role,
                    hashed_password,
                    None,
                    datetime.utcnow(),
                    datetime.utcnow(),
                )
            finally:
                if conn:
                    await conn.close()

        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id},
            expires_delta=access_token_expires
        )

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                email=user_data.email,
                full_name=user_data.full_name,
                role=user_data.role,
                created_at=user_profile["created_at"]
            )
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    """
    Đăng nhập bằng email & password
    """
    try:
        import hashlib

        # Find user by email
        users = db_firestore.collection("users").where("email", "==", credentials.email).stream()
        user_data = None
        user_id = None

        for user in users:
            user_data = user.to_dict()
            user_id = user.id
            break

        if not user_data:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Verify password
        hashed_password = hashlib.sha256(credentials.password.encode()).hexdigest()
        if user_data.get("password_hash") != hashed_password:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id},
            expires_delta=access_token_expires
        )

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                created_at=user_data["created_at"]
            )
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Login failed")

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    """
    Google OAuth Sign-in / Sign-up
    """
    try:
        from google.auth.transport.requests import Request as GoogleRequest
        from google.oauth2 import id_token

        # Verify Google ID token
        idinfo = id_token.verify_oauth2_token(
            request.id_token,
            GoogleRequest(),
            os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        )

        email = idinfo.get("email")
        full_name = idinfo.get("name", email.split("@")[0])
        user_id_from_google = idinfo.get("sub")

        # Check if user exists
        existing_users = db_firestore.collection("users").where("email", "==", email).stream()
        user_data = None
        user_id = None

        for user in existing_users:
            user_data = user.to_dict()
            user_id = user.id
            break

        # If not exists, create new user (default role: student)
        if not user_data:
            user_id = user_id_from_google
            user_profile = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "role": "student",  # Default role for Google signup
                "google_id": user_id_from_google,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            db_firestore.collection("users").document(user_id).set(user_profile)
            user_data = user_profile

        # Mirror Google user into Cloud SQL for FK consistency
        if DATABASE_URL:
            conn = None
            try:
                conn = await asyncpg.connect(DATABASE_URL)
                await conn.execute(
                    """
                    INSERT INTO users (id, email, full_name, role, password_hash, google_id, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    user_id,
                    user_data["email"],
                    user_data["full_name"],
                    user_data["role"],
                    user_data.get("password_hash"),
                    user_data.get("google_id"),
                    datetime.utcnow(),
                    datetime.utcnow(),
                )
            finally:
                if conn:
                    await conn.close()

        # Create JWT token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id},
            expires_delta=access_token_expires
        )

        return Token(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=user_id,
                email=user_data["email"],
                full_name=user_data["full_name"],
                role=user_data["role"],
                created_at=user_data["created_at"]
            )
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google auth failed: {str(e)}")

@router.get("/me", response_model=UserResponse)
async def get_current_user_endpoint(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    """
    Lấy thông tin user hiện tại
    """
    user_data = await get_current_user(authorization)
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        full_name=user_data["full_name"],
        role=user_data["role"],
        created_at=user_data["created_at"]
    )

@router.post("/logout")
async def logout():
    """
    Đăng xuất (xóa token ở frontend)
    """
    return {"message": "Logout successful"}
