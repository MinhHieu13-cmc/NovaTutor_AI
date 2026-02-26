import { create } from 'zustand';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  addMessage: (message: Message) => void;
  setStreaming: (status: boolean) => void;
  updateLastAssistantMessage: (chunk: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setStreaming: (status) => set({ isStreaming: status }),
  updateLastAssistantMessage: (chunk) => set((state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      const updatedMessages = [...state.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        content: lastMessage.content + chunk,
      };
      return { messages: updatedMessages };
    }
    return state;
  }),
  clearMessages: () => set({ messages: [] }),
}));
