import { create } from 'zustand';
import type { ChatSource } from '@/services/ragService';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: ChatSource[];
}

interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isRecording: boolean;
  currentEmotion: string;
  criticalError: string | null;
  learningProgress: {
    subject: string;
    score: number;
    total: number;
  }[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setStreaming: (status: boolean) => void;
  setSpeaking: (status: boolean) => void;
  setMuted: (status: boolean) => void;
  setRecording: (status: boolean) => void;
  setEmotion: (emotion: string) => void;
  setCriticalError: (error: string | null) => void;
  setLearningProgress: (progress: { subject: string; score: number; total: number }[]) => void;
  updateLastAssistantMessage: (chunk: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  isSpeaking: false,
  isMuted: false,
  isRecording: false,
  currentEmotion: 'neutral',
  criticalError: null,
  learningProgress: [
    { subject: 'Toán học', score: 85, total: 100 },
    { subject: 'Vật lý', score: 70, total: 100 },
    { subject: 'Tiếng Anh', score: 92, total: 100 },
  ],
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  setMessages: (messages) => set({ messages }),
  setStreaming: (status) => set({ isStreaming: status }),
  setSpeaking: (status) => set({ isSpeaking: status }),
  setMuted: (status) => set({ isMuted: status }),
  setRecording: (status) => set({ isRecording: status }),
  setEmotion: (emotion) => set({ currentEmotion: emotion }),
  setCriticalError: (error) => set({ criticalError: error }),
  setLearningProgress: (progress) => set({ learningProgress: progress }),
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
