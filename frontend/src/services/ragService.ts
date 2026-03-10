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

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_name: string;
  course_id: string;
  chunk_text: string;
  chunk_index: number;
  similarity_score: number;
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
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatResponse> {
    const response = await fetch(`${API_URL}/rag/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        course_id: courseId,
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
}

export const ragService = new RAGService();

