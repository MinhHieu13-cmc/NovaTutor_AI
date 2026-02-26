from typing import List, AsyncGenerator, Dict, Any
from backend.app.domain.services.interfaces import ILLMProvider, ChatMessage, LLMResponse
from backend.app.application.services.rag_engine import RAGEngine
from backend.app.domain.services.plugin_base import PluginRegistry

from backend.app.application.agents.tutor_agent import TutorAgent

class Orchestrator:
    def __init__(
        self, 
        llm: ILLMProvider, 
        rag_engine: RAGEngine = None,
        plugin_registry: PluginRegistry = None,
        tutor_agent: TutorAgent = None
    ):
        self.llm = llm
        self.rag_engine = rag_engine
        self.plugin_registry = plugin_registry
        self.tutor_agent = tutor_agent

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
