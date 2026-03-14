// RAG Service - Document Processing & AI Chat
import { authService } from './authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSource {
  document_name: string;
  chunk_text: string;
  similarity_score: number;
}

export interface ChatResponse {
  response: string;
  sources: ChatSource[];
  conversation_id?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  message_count?: number;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  course_id: string;
  chunk_text: string;
  chunk_index: number;
  similarity_score: number;
}

export interface SavedConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface LoadConversationResponse {
  messages: SavedConversationMessage[];
  total: number;
}

class RAGService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
  }

  // Process document after upload (trigger embedding generation)
  async processDocument(
    documentId: string,
    documentUrl: string,
    courseId: string
  ): Promise<{ message: string; chunks_created: number }> {
    const response = await fetch(`${API_URL}/rag/process-document`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        document_id: documentId,
        document_url: documentUrl,
        course_id: courseId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to process document');
    }

    return await response.json();
  }

  // Semantic search over course documents
  async semanticSearch(
    query: string,
    courseId?: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    const response = await fetch(`${API_URL}/rag/search`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query,
        course_id: courseId,
        top_k: topK,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Search failed');
    }

    const data = await response.json();
    return data.results;
  }

  // Chat with AI tutor using RAG context
  async chat(
    message: string,
    courseId?: string,
    conversationHistory: ChatMessage[] = [],
    sessionId?: string,
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/rag/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        course_id: courseId,
        session_id: sessionId,
        conversation_history: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Chat failed');
    }

    return await response.json();
  }

  // Check RAG engine health
  async health(): Promise<{ status: string; engine: string }> {
    const response = await fetch(`${API_URL}/rag/health`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('RAG engine health check failed');
    }

    return await response.json();
  }

  async loadConversation(courseId?: string, limit: number = 60, sessionId?: string): Promise<LoadConversationResponse> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (courseId) params.set('course_id', courseId);
    if (sessionId) params.set('session_id', sessionId);

    const response = await fetch(`${API_URL}/rag/conversation/load?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to load conversation');
    }

    return await response.json();
  }

  async saveConversation(messages: SavedConversationMessage[], courseId?: string, sessionId?: string): Promise<{ saved_count: number }> {
    const response = await fetch(`${API_URL}/rag/conversation/save`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        session_id: sessionId,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to save conversation');
    }

    return await response.json();
  }

  async listSessions(courseId?: string): Promise<ChatSession[]> {
    const params = new URLSearchParams();
    if (courseId) params.set('course_id', courseId);

    const response = await fetch(`${API_URL}/rag/conversation/sessions?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to load sessions');
    }

    const data = await response.json();
    return data.sessions || [];
  }

  async createSession(title: string, courseId?: string): Promise<ChatSession> {
    const response = await fetch(`${API_URL}/rag/conversation/sessions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ title, course_id: courseId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create session');
    }

    return await response.json();
  }

  async deleteSession(sessionId: string): Promise<{ deleted: boolean }> {
    const response = await fetch(`${API_URL}/rag/conversation/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete session');
    }

    return await response.json();
  }
}

export const ragService = new RAGService();

