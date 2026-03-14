import vertexai
from typing import List, AsyncGenerator
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel, Content, Part
from app.domain.services.interfaces import ILLMProvider, ChatMessage, LLMResponse

class VertexAIProvider(ILLMProvider):
    def __init__(self, project_id: str, location: str, default_model: str = "gemini-2.5-flash"):
        self.project_id = project_id
        self.location = location
        self.default_model = default_model
        # Khởi tạo toàn cục Vertex AI SDK
        aiplatform.init(project=project_id, location=location)
        vertexai.init(project=project_id, location=location)
        self.model = GenerativeModel(default_model)

    async def generate(self, messages: List[ChatMessage], **kwargs) -> LLMResponse:
        model_name = kwargs.get("model", self.default_model)
        if model_name != self.default_model:
            model = GenerativeModel(model_name)
        else:
            model = self.model
            
        history = []
        for m in messages[:-1]:
            history.append(Content(role="user" if m.role == "user" else "model", parts=[Part.from_text(m.content)]))
        
        chat = model.start_chat(history=history)
        response = await chat.send_message_async(messages[-1].content)
        
        return LLMResponse(
            content=response.text,
            usage={
                "prompt_tokens": response.usage_metadata.prompt_token_count,
                "completion_tokens": response.usage_metadata.candidates_token_count,
                "total_tokens": response.usage_metadata.total_token_count
            },
            metadata={"model": model_name}
        )

    async def stream(self, messages: List[ChatMessage], **kwargs) -> AsyncGenerator[str, None]:
        model_name = kwargs.get("model", self.default_model)
        if model_name != self.default_model:
            model = GenerativeModel(model_name)
        else:
            model = self.model
            
        history = []
        for m in messages[:-1]:
            # Vertex AI use 'model' instead of 'assistant'
            role = "user" if m.role == "user" else "model"
            history.append({"role": role, "parts": [Part.from_text(m.content)]})
        
        chat = model.start_chat(history=history)
        responses = await chat.send_message_async(messages[-1].content, stream=True)
        
        async for response in responses:
            yield response.text
