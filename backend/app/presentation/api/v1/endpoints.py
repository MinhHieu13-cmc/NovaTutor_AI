from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from typing import List
from datetime import datetime
from app.domain.services.interfaces import ChatMessage
from app.application.services.orchestrator import Orchestrator
from app.presentation.api.v1.deps import get_orchestrator, get_current_user
from app.domain.models.core import User, Workspace

router = APIRouter()

@router.post("/chat/stream")
async def chat_stream(
    messages: List[ChatMessage],
    workspace_id: str,
    use_agent: bool = False,
    orchestrator: Orchestrator = Depends(get_orchestrator),
    current_user: User = Depends(get_current_user)
):
    # Verify user has access to workspace (additional layer above RLS)
    # In a real app, you would fetch workspace from DB here
    # and check current_user.tenant_id and workspace permissions
    mock_workspace = Workspace(
        id=workspace_id,
        tenant_id=current_user.tenant_id,
        name="Example Workspace",
        created_at=datetime.utcnow()
    )

    async def event_generator():
        async for chunk in orchestrator.route_and_execute(
            messages=messages,
            workspace_id=workspace_id,
            use_rag=mock_workspace.settings.enable_rag,
            use_plugins=mock_workspace.settings.enable_plugins,
            enable_usage_tracking=True,
            use_agent=use_agent
        ):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
