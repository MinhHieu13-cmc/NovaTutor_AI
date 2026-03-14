from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.presentation.api.v1 import auth_gcp
from app.presentation.api.v1.auth_gcp import router as auth_router


class FakeAuthDB:
    def __init__(self) -> None:
        self.users_by_email: dict[str, dict] = {}
        self.users_by_id: dict[str, dict] = {}

    async def fetchrow(self, query: str, *args):
        if "SELECT id FROM users WHERE email = $1" in query:
            email = args[0]
            user = self.users_by_email.get(email)
            return {"id": user["id"]} if user else None

        if "SELECT * FROM users WHERE email = $1" in query:
            return self.users_by_email.get(args[0])

        if "SELECT * FROM users WHERE id = $1" in query:
            return self.users_by_id.get(args[0])

        return None

    async def execute(self, query: str, *args):
        if "INSERT INTO users" in query:
            user_id, email, full_name, role, password_hash, _google_id, created_at = args
            row = {
                "id": user_id,
                "email": email,
                "full_name": full_name,
                "role": role,
                "password_hash": password_hash,
                "created_at": created_at,
            }
            self.users_by_email[email] = row
            self.users_by_id[user_id] = row

    async def close(self):
        return None


def _build_client(fake_db: FakeAuthDB, monkeypatch) -> TestClient:
    app = FastAPI()
    app.include_router(auth_router, prefix="/api/v1")

    async def _fake_conn():
        return fake_db

    monkeypatch.setattr(auth_gcp, "_conn", _fake_conn)
    return TestClient(app)


def test_register_rejects_invalid_role(monkeypatch) -> None:
    fake_db = FakeAuthDB()
    client = _build_client(fake_db, monkeypatch)

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@example.com",
            "password": "12345678",
            "full_name": "Student Test",
            "role": "admin",
        },
    )

    assert response.status_code == 422


def test_register_rejects_short_password(monkeypatch) -> None:
    fake_db = FakeAuthDB()
    client = _build_client(fake_db, monkeypatch)

    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@example.com",
            "password": "123",
            "full_name": "Student Test",
            "role": "student",
        },
    )

    assert response.status_code == 422


def test_register_and_login_success(monkeypatch) -> None:
    fake_db = FakeAuthDB()
    client = _build_client(fake_db, monkeypatch)

    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "teacher@example.com",
            "password": "longpassword123",
            "full_name": "Teacher Test",
            "role": "teacher",
        },
    )
    assert register.status_code == 200

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "teacher@example.com",
            "password": "longpassword123",
        },
    )
    assert login.status_code == 200
    payload = login.json()
    assert payload["token_type"] == "bearer"
    assert payload["user"]["role"] == "teacher"


def test_create_access_token_fails_when_strict_secret_enabled(monkeypatch) -> None:
    monkeypatch.setattr(auth_gcp.settings, "ENFORCE_STRONG_JWT_SECRET", True)
    monkeypatch.setattr(auth_gcp.settings, "JWT_SECRET_KEY", "short-secret")

    response = None
    try:
        auth_gcp.create_access_token({"sub": "u-1"})
    except Exception as exc:  # HTTPException expected
        response = exc

    assert response is not None
    assert getattr(response, "status_code", None) == 503

    # Reset to default-safe test mode for other tests
    monkeypatch.setattr(auth_gcp.settings, "ENFORCE_STRONG_JWT_SECRET", False)
    monkeypatch.setattr(
        auth_gcp.settings,
        "JWT_SECRET_KEY",
        "local_dev_secret_change_before_deploy_32chars",
    )

