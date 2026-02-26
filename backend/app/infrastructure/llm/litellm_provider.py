from typing import List, AsyncGenerator
import litellm
from backend.app.domain.services.interfaces import ILLMProvider, ChatMessage, LLMResponse

class LiteLLMProvider(ILLMProvider):
    def __init__(self, default_model: str = "gpt-3.5-turbo"):
        self.default_model = default_model

    async def generate(self, messages: List[ChatMessage], **kwargs) -> LLMResponse:
        model = kwargs.get("model", self.default_model)
        formatted_messages = [{"role": m.role, "content": m.content} for m in messages]
        
        response = await litellm.acompletion(
            model=model,
            messages=formatted_messages,
            **kwargs
        )
        
        return LLMResponse(
            content=response.choices[0].message.content,
            usage={
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            },
            metadata={"model": model}
        )

    async def stream(self, messages: List[ChatMessage], **kwargs) -> AsyncGenerator[str, None]:
        model = kwargs.get("model", self.default_model)
        formatted_messages = [{"role": m.role, "content": m.content} for m in messages]
        
        response = await litellm.acompletion(
            model=model,
            messages=formatted_messages,
            stream=True,
            **kwargs
        )
        
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
