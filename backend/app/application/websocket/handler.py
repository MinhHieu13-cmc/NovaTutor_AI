import json
from fastapi import WebSocket, WebSocketDisconnect
from app.application.services.orchestrator import Orchestrator
from app.infrastructure.voice.processor import VoiceProcessor
from app.domain.services.interfaces import ChatMessage

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

manager = ConnectionManager()

async def websocket_handler(
    websocket: WebSocket, 
    orchestrator: Orchestrator,
    voice_processor: VoiceProcessor
):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # 1. Xử lý Input (Voice hoặc Text)
            text_input = ""
            if "audio" in message_data:
                # Chuyển audio base64 sang text
                audio_bytes = base64.b64decode(message_data["audio"])
                text_input = await voice_processor.stt(audio_bytes)
            else:
                text_input = message_data.get("text", "")

            # 2. Gọi Orchestrator để lấy phản hồi từ Agent
            messages = [ChatMessage(role="user", content=text_input)]
            full_response = ""
            
            # Gửi tín hiệu đang xử lý
            await manager.send_personal_message({"type": "status", "content": "thinking"}, websocket)

            async for chunk in orchestrator.route_and_execute(
                messages=messages,
                workspace_id="ws_voice",
                use_agent=True
            ):
                full_response += chunk
                # Gửi text chunk theo thời gian thực
                await manager.send_personal_message({"type": "text_chunk", "content": chunk}, websocket)

            # 3. Chuyển đổi phản hồi sang Voice và Lip-sync
            audio_output = await voice_processor.tts(full_response)
            lip_sync = voice_processor.get_lip_sync_data(audio_output)
            
            # 4. Xác định cảm xúc để điều khiển Animation (Dựa trên EmotionAdapter nếu có)
            # Trong thực tế, Orchestrator đã tích hợp EmotionAdapter, ta có thể lấy từ metadata hoặc context
            emotion = "happy" # Mock

            # 5. Gửi dữ liệu Avatar cuối cùng
            await manager.send_personal_message({
                "type": "avatar_event",
                "audio": base64.b64encode(audio_output).decode('utf-8'),
                "lip_sync": lip_sync,
                "emotion": emotion,
                "full_text": full_response
            }, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket)

import base64
