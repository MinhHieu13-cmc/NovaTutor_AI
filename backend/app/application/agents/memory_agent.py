from typing import List, AsyncGenerator, Dict, Any
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from app.domain.repositories.interfaces import IStudentRepository, ISessionRepository

class MemoryAgent:
    def __init__(
        self, 
        student_repo: IStudentRepository, 
        session_repo: ISessionRepository,
        model_name: str = "gemini-2.0-flash"
    ):
        self.student_repo = student_repo
        self.session_repo = session_repo
        self.model_name = f"gemini/{model_name}" if "/" not in model_name else model_name
        self.instruction = (
            "You are a Memory Specialist. Your role is to maintain and update the "
            "student's learning profile and provide context from previous sessions."
        )

        async def get_student_context(student_id: str) -> str:
            """Retrieves student profile and learning progress."""
            profile = await self.student_repo.get_by_id(student_id)
            return f"Student Profile: {profile}"

        async def update_student_profile(student_id: str, insights: str) -> str:
            """Updates student profile with new insights from the conversation."""
            await self.student_repo.update_profile(student_id, {"recent_insights": insights})
            return "Profile updated successfully."

        self.agent = Agent(
            name="MemoryAgent",
            model=self.model_name,
            instruction=self.instruction,
            tools=[get_student_context, update_student_profile]
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
