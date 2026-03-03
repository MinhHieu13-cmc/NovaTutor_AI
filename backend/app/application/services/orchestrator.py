from typing import List, AsyncGenerator, Dict, Any
from app.domain.services.interfaces import ILLMProvider, ChatMessage, LLMResponse
from app.application.services.rag_engine import RAGEngine
from app.domain.services.plugin_base import PluginRegistry

from app.application.agents.tutor_agent import TutorAgent
from app.application.agents.curriculum_agent import CurriculumAgent
from app.application.agents.memory_agent import MemoryAgent
from app.application.agents.assessment_agent import AssessmentAgent
from app.application.agents.emotion_adapter import EmotionAdapter
from app.application.services.tool_policy import ToolPolicyLayer

class Orchestrator:
    def __init__(
        self, 
        llm: ILLMProvider, 
        rag_engine: RAGEngine = None,
        plugin_registry: PluginRegistry = None,
        tutor_agent: TutorAgent = None,
        curriculum_agent: CurriculumAgent = None,
        memory_agent: MemoryAgent = None,
        assessment_agent: AssessmentAgent = None,
        emotion_adapter: EmotionAdapter = None,
        tool_policy: ToolPolicyLayer = None
    ):
        self.llm = llm
        self.rag_engine = rag_engine
        self.plugin_registry = plugin_registry
        self.tutor_agent = tutor_agent
        self.curriculum_agent = curriculum_agent
        self.memory_agent = memory_agent
        self.assessment_agent = assessment_agent
        self.emotion_adapter = emotion_adapter
        self.tool_policy = tool_policy

    async def route_and_execute(
        self, 
        messages: List[ChatMessage], 
        workspace_id: str,
        use_rag: bool = True,
        use_plugins: bool = True,
        enable_usage_tracking: bool = True,
        use_agent: bool = False
    ) -> AsyncGenerator[str, None]:
        # 1. Use Specialized Agent if requested
        if use_agent and self.tutor_agent:
            import uuid
            internal_session_id = str(uuid.uuid4())
            student_message = messages[-1].content

            # --- Stage 3: Multi-Agent Flow ---
            
            # 1a. Analyze Emotion
            emotion_context = ""
            if self.emotion_adapter:
                async for e_chunk in self.emotion_adapter.chat(student_message, internal_session_id):
                    emotion_context += e_chunk

            # 1b. Consult Memory
            memory_context = ""
            if self.memory_agent:
                async for m_chunk in self.memory_agent.chat(student_message, internal_session_id):
                    memory_context += m_chunk

            # 1c. Consult Curriculum
            curriculum_context = ""
            if self.curriculum_agent:
                async for c_chunk in self.curriculum_agent.chat(student_message, internal_session_id):
                    curriculum_context += c_chunk

            # 1d. Assessment (Evaluate if student is answering a question)
            assessment_context = ""
            if self.assessment_agent:
                # Logic to determine if assessment is needed (simplified)
                if any(keyword in student_message.lower() for keyword in ["đáp án", "trả lời", "kết quả"]):
                    async for a_chunk in self.assessment_agent.chat(student_message, internal_session_id):
                        assessment_context += a_chunk

            # 1e. Synthesize with TutorAgent
            is_critical_error = "[CRITICAL_ERROR]" in assessment_context
            
            error_intervention = ""
            if is_critical_error:
                error_intervention = (
                    "\n!!! QUAN TRỌNG: Học sinh đang mắc lỗi sai nghiêm trọng. "
                    "Bỏ qua việc tiếp tục bài học mới, hãy tập trung GIẢI THÍCH CHI TIẾT lỗi sai này "
                    "và hướng dẫn lại kiến thức căn bản trước khi làm bất cứ điều gì khác !!!\n"
                )

            enhanced_prompt = (
                f"Emotion Context: {emotion_context}\n"
                f"Memory Context: {memory_context}\n"
                f"Curriculum Context: {curriculum_context}\n"
                f"Assessment Context: {assessment_context}\n"
                f"{error_intervention}"
                f"Student Message: {student_message}"
            )
            
            # Logging for traceability
            print(f"[Trace] Session: {internal_session_id} | Multi-Agent Flow completed.")

            messages[-1].content = enhanced_prompt
            async for chunk in self.tutor_agent.chat(messages):
                yield chunk
            return

        # 2. Intent detection (simplified for template)
        last_message = messages[-1].content
        
        context_docs = []
        if use_rag and self.rag_engine:
            context_docs = await self.rag_engine.query(last_message, workspace_id)
            # Inject context into prompt
            if context_docs:
                context_str = "\n".join([d['content'] for d in context_docs])
                messages[-1].content = f"Context:\n{context_str}\n\nQuestion: {last_message}"

        # 2. Plugin execution (simplified - could be function calling)
        # 3. Usage tracking (simplified)
        tokens_estimate = 0
        
        async for chunk in self.llm.stream(messages):
            tokens_estimate += 1 # Simplified token counting
            yield chunk

        if enable_usage_tracking:
            # Logic to log usage to database
            pass

    async def _detect_intent(self, text: str) -> str:
        # Placeholder for routing logic
        return "direct_llm"
