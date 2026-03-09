from typing import List, AsyncGenerator
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService
from app.domain.repositories.interfaces import IVectorRepository

class CurriculumAgent:
    def __init__(self, vector_repo: IVectorRepository, model_name: str = "gemini-live-2.5-flash-native-audio"):
        self.vector_repo = vector_repo
        self.model_name = model_name
        self.instruction = (
            "You are a Curriculum Expert. Your job is to find the most relevant "
            "educational content for the student's questions using the provided tools."
        )
        
        # In a real RAG implementation, this tool would be linked to the vector repo
        async def search_curriculum(query: str) -> str:
            """Searches the curriculum database for relevant material."""
            # 1. Embed query (simplified)
            # 2. Search vector repo
            results = await self.vector_repo.search([0.1]*768) 
            return "\n".join([r['content'] for r in results])

        self.agent = Agent(
            name="CurriculumAgent",
            model=self.model_name,
            instruction=self.instruction,
            tools=[search_curriculum]
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
