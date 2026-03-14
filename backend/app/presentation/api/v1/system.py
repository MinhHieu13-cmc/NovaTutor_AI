from fastapi import APIRouter, Depends, HTTPException, Header
from google.cloud import secretmanager

from app.core.config import settings
from app.presentation.api.v1.auth_gcp import get_current_user

router = APIRouter(prefix="/system", tags=["system"])


def _read_gemini_key_from_secret_manager() -> str | None:
    if not settings.GCP_PROJECT_ID or not settings.GEMINI_API_KEY_SECRET:
        return None

    client = secretmanager.SecretManagerServiceClient()
    secret_name = f"projects/{settings.GCP_PROJECT_ID}/secrets/{settings.GEMINI_API_KEY_SECRET}/versions/latest"
    response = client.access_secret_version(request={"name": secret_name})
    return response.payload.data.decode("utf-8")


@router.get("/gemini-key")
async def get_gemini_key(authorization: str | None = Header(default=None, alias="Authorization")):
    # Require authenticated session before returning runtime API key
    await get_current_user(authorization)

    key = settings.GEMINI_API_KEY
    if not key:
        key = _read_gemini_key_from_secret_manager()

    if not key:
        raise HTTPException(status_code=503, detail="Gemini key is not configured on backend")

    return {"api_key": key}

