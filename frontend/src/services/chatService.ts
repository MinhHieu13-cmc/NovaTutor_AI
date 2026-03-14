import { authService } from './authService';

// API_URL đã chứa /api/v1 từ env — chỉ thêm path sau
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type StreamChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const chatService = {
  async streamChat(
    messages: StreamChatMessage[],
    workspaceId: string,
    onChunk: (chunk: string) => void
  ) {
    const token = authService.getToken(); // dùng đúng key 'novatutor_token'
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages, workspace_id: workspaceId }),
    });

    if (!response.ok) throw new Error('Failed to start stream');

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          onChunk(data);
        }
      }
    }
  },
};
