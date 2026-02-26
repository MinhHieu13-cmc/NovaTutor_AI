export const chatService = {
  async streamChat(messages: any[], workspaceId: string, onChunk: (chunk: string) => void) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
          if (data === '[DONE]') break;
          onChunk(data);
        }
      }
    }
  }
};
