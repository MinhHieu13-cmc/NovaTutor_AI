from typing import List, AsyncGenerator
from google.adk import Agent, Runner
from google.adk.sessions import InMemorySessionService

class AssessmentAgent:
    def __init__(self, model_name: str = "gemini-2.0-flash"):
        self.model_name = f"gemini/{model_name}" if "/" not in model_name else model_name
        self.instruction = (
            "Bạn là AssessmentAgent, chuyên gia đánh giá câu trả lời của học sinh. "
            "Nhiệm vụ của bạn là phân tích câu trả lời của học sinh, xác định xem họ có hiểu bài không, "
            "và chỉ ra những lỗi sai hoặc điểm cần cải thiện. "
            "ĐẶC BIỆT: Nếu học sinh trả lời sai hoàn toàn hoặc có lỗ hổng kiến thức nghiêm trọng, "
            "hãy bắt đầu phản hồi của bạn bằng chuỗi ký tự [CRITICAL_ERROR]. "
            "Bạn cung cấp phản hồi mang tính xây dựng và chấm điểm mức độ hiểu bài."
        )
        
        async def evaluate_answer(student_answer: str, correct_criteria: str) -> str:
            """
            Đánh giá câu trả lời của học sinh dựa trên tiêu chí đúng.
            Args:
                student_answer: Câu trả lời của học sinh.
                correct_criteria: Tiêu chí hoặc đáp án đúng để so sánh.
            """
            # Trong thực tế, đây có thể là một lời gọi đến LLM khác hoặc logic so sánh
            return f"Đã đánh giá: '{student_answer}' so với '{correct_criteria}'. Kết quả: Cần giải thích thêm về phần cốt lõi."

        self.agent = Agent(
            name="AssessmentAgent",
            model=self.model_name,
            instruction=self.instruction,
            tools=[evaluate_answer]
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
