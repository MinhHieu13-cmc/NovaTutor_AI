from typing import List, AsyncGenerator
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from backend.app.domain.services.interfaces import ChatMessage
from backend.app.application.tools.calculator import calculate
from backend.app.application.tools.knowledge_lookup import knowledge_lookup

class TutorAgent:
    # gemini-2.0-flash-001 phiên bản phù hợp cho hỗ trợ độ trễ thấp cho việc truyền phát trực tuyến theo thời gian thực
    def __init__(self, api_key: str = None, model_name: str = "gemini-2.0-flash-001"):
        self.model_name = f"models/{model_name}" if not model_name.startswith("models/") else model_name
        self.instruction = (
            "Bạn là NovaTutor, một gia sư AI thân thiện và thông minh. "
            "Bạn giúp học sinh giải bài tập, giải thích các khái niệm phức tạp và "
            " hướng dẫn họ cách giải quyết vấn đề bằng cách sử dụng các công cụ được cung cấp."
        )
        self.agent = Agent(
            name="TutorAgent",
            model=self.model_name,
            instruction=self.instruction,
            tools=[calculate, knowledge_lookup]
        )
        self.session_service = InMemorySessionService()
        self.runner = Runner(session_service=self.session_service)

    async def chat(self, messages: List[ChatMessage]) -> AsyncGenerator[str, None]:
        # Since NovaTutor is currently stateless, we pass the full prompt 
        # or clear the session before each call.
        # ADK is session-based, so for a truly stateless feel, we can use a new session_id.
        import uuid
        session_id = str(uuid.uuid4())
        
        last_message = messages[-1].content
        
        async for event in self.runner.run_async(
            agent=self.agent, 
            input=last_message, 
            session_id=session_id
        ):
            # ADK events usually contain content that might be text or tool calls.
            if hasattr(event, 'content') and event.content:
                # ADK Content model usually has a text property or similar.
                # Based on the Event structure, content might have parts or just text.
                if hasattr(event.content, 'text') and event.content.text:
                    yield event.content.text
                elif hasattr(event, 'text') and event.text:
                    yield event.text
                elif hasattr(event, 'delta') and event.delta:
                    yield event.delta
