"""
Auth API — Dual-mode: PostgreSQL (local) + Firestore (GCP production)
- LOCAL:  DATABASE_URL set → dùng PostgreSQL trực tiếp, không cần GCP ADC
- GCP:    DATABASE_URL trỏ Cloud SQL + Firestore available → dùng cả hai
"""
import os
import uuid
import hashlib
from typing import Optional, Literal
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, EmailStr, field_validator
import jwt
import asyncpg
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


# ─── Database URL ─────────────────────────────────────────────────────────────
_RAW = os.getenv("DATABASE_URL", "")
DATABASE_URL = _RAW.replace("postgresql+asyncpg://", "postgresql://") if _RAW else None

# ─── Firestore (optional — only used in GCP production) ──────────────────────
_firestore_client = None
try:
    from google.cloud import firestore as _fs
    _firestore_client = _fs.Client()
except Exception:
    pass  # Expected locally — auth falls back to PostgreSQL only

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["student", "teacher"]

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value) < settings.AUTH_PASSWORD_MIN_LENGTH:
            raise ValueError(f"Password must be at least {settings.AUTH_PASSWORD_MIN_LENGTH} characters")
        return value

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
    id_token: str

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _assert_jwt_secret_security() -> None:
    if settings.ENFORCE_STRONG_JWT_SECRET and not settings.is_jwt_secret_strong():
        raise HTTPException(
            status_code=503,
            detail="JWT_SECRET_KEY is weak. Please configure a strong secret for production.",
        )

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    _assert_jwt_secret_security()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_TOKEN_TTL_MINUTES)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

async def _conn():
    """Open asyncpg connection; raises 503 if DATABASE_URL missing."""
    if not DATABASE_URL:
        raise HTTPException(status_code=503, detail="DATABASE_URL is not configured.")
    try:
        return await asyncpg.connect(DATABASE_URL)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"DB connection failed: {e}")

# ─── JWT Dependency (used by other routers) ───────────────────────────────────

async def get_current_user(
    authorization: Optional[str] = Header(default=None, alias="Authorization")
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = authorization.split("Bearer ")[1]
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    db = await _conn()
    try:
        row = await db.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
    finally:
        await db.close()

    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)

# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister):
    db = await _conn()
    try:
        existing = await db.fetchrow("SELECT id FROM users WHERE email = $1", user_data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        uid        = str(uuid.uuid4())
        pw_hash    = _hash_pw(user_data.password)
        created_at = datetime.now(timezone.utc)

        await db.execute(
            """
            INSERT INTO users (id, email, full_name, role, password_hash, google_id, created_at, updated_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
            """,
            uid, user_data.email, user_data.full_name,
            user_data.role, pw_hash, None, created_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {e}")
    finally:
        await db.close()

    # Mirror to Firestore on GCP (best-effort, never blocks local flow)
    if _firestore_client:
        try:
            _firestore_client.collection("users").document(uid).set({
                "id": uid, "email": user_data.email,
                "full_name": user_data.full_name, "role": user_data.role,
                "password_hash": pw_hash, "created_at": created_at.isoformat(),
            })
        except Exception:
            pass

    return Token(
        access_token=create_access_token({"sub": uid}),
        token_type="bearer",
        user=UserResponse(
            id=uid, email=user_data.email,
            full_name=user_data.full_name, role=user_data.role,
            created_at=created_at.isoformat(),
        )
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    db = await _conn()
    try:
        row = await db.fetchrow("SELECT * FROM users WHERE email = $1", credentials.email)
    finally:
        await db.close()

    if not row or row["password_hash"] != _hash_pw(credentials.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return Token(
        access_token=create_access_token({"sub": row["id"]}),
        token_type="bearer",
        user=UserResponse(
            id=row["id"], email=row["email"],
            full_name=row["full_name"], role=row["role"],
            created_at=str(row["created_at"]),
        )
    )


@router.post("/google", response_model=Token)
async def google_auth(request: GoogleAuthRequest):
    """Verify Google ID token → upsert user in PostgreSQL."""
    try:
        from google.oauth2 import id_token as _id_token
        from google.auth.transport.requests import Request as _GReq
        idinfo = _id_token.verify_oauth2_token(
            request.id_token, _GReq(), os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google token verification failed: {e}")

    email      = idinfo["email"]
    full_name  = idinfo.get("name", email.split("@")[0])
    google_sub = idinfo["sub"]

    db = await _conn()
    try:
        row = await db.fetchrow("SELECT * FROM users WHERE email = $1", email)
        if row:
            uid         = row["id"]
            role        = row["role"]
            created_iso = str(row["created_at"])
        else:
            uid        = google_sub
            role       = "student"
            created_at = datetime.now(timezone.utc)
            created_iso = created_at.isoformat()
            await db.execute(
                """
                INSERT INTO users (id, email, full_name, role, password_hash, google_id, created_at, updated_at)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$7) ON CONFLICT (id) DO NOTHING
                """,
                uid, email, full_name, role, None, google_sub, created_at,
            )
    finally:
        await db.close()

    return Token(
        access_token=create_access_token({"sub": uid}),
        token_type="bearer",
        user=UserResponse(
            id=uid, email=email, full_name=full_name,
            role=role, created_at=created_iso,
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(authorization: Optional[str] = Header(default=None, alias="Authorization")):
    user = await get_current_user(authorization)
    return UserResponse(
        id=user["id"], email=user["email"],
        full_name=user["full_name"], role=user["role"],
        created_at=str(user["created_at"]),
    )


@router.post("/logout")
async def logout():
    return {"message": "Logout successful"}
