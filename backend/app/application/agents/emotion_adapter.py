from typing import List, AsyncGenerator
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService

class EmotionAdapter:
    def __init__(self, model_name: str = "gemini-live-2.5-flash-native-audio"):
        self.model_name = model_name
        self.instruction = (
            "Bạn là EmotionAdapter. Nhiệm vụ của bạn là phân tích trạng thái cảm xúc của học sinh "
            "dựa trên tin nhắn của họ và đề xuất tông giọng phù hợp cho Gia sư AI (TutorAgent). "
            "Bạn nên nhận diện các cảm xúc như: bối rối, hào hứng, nản chí, lo lắng, hoặc tự tin."
        )
        
        async def analyze_sentiment(text: str) -> str:
            """
            Phân tích cảm xúc từ văn bản.
            """
            # Logic phân tích cảm xúc (Mock)
            return "Cảm xúc: Hơi bối rối. Đề xuất: Tông giọng kiên nhẫn và khích lệ."

        self.agent = Agent(
            name="EmotionAdapter",
            model=self.model_name,
            instruction=self.instruction,
            tools=[analyze_sentiment]
        )
        self.runner = Runner(
            agent=self.agent,
            app_name="NovaTutor",
            session_service=InMemorySessionService()
        )

    async def chat(self, message: str, session_id: str) -> AsyncGenerator[str, None]:
        from google.adk.runners import types
        user_id = "student_123"
        app_name = "NovaTutor"
        
        # Ensure session exists
        await self.runner.session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id
        )
        
        new_message = types.Content(parts=[types.Part(text=message)])

        async for event in self.runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message
        ):
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'text') and event.content.text:
                    yield event.content.text
