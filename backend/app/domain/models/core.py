from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from uuid import UUID
from datetime import datetime

class UserRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

class Tenant(BaseModel):
    id: UUID
    name: str
    created_at: datetime

class WorkspaceSettings(BaseSettings):
    enable_rag: bool = True
    enable_plugins: bool = True
    rate_limit_rpm: int = 60
    feature_flags: Dict[str, bool] = Field(default_factory=dict)

class Workspace(BaseModel):
    id: UUID
    tenant_id: UUID
    name: str
    settings: WorkspaceSettings = Field(default_factory=WorkspaceSettings)
    created_at: datetime

class User(BaseModel):
    id: UUID
    email: str
    role: UserRole
    tenant_id: UUID

class UsageRecord(BaseModel):
    id: Optional[UUID] = None
    workspace_id: UUID
    user_id: UUID
    feature: str
    tokens_used: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Session(BaseModel):
    id: Optional[UUID] = None
    student_id: UUID
    subject: str
    topic: str
    duration_minutes: int
    workspace_id: UUID
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

