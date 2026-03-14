import { authService } from './authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// ── Types ────────────────────────────────────────────────────────────────────

export interface LessonOutlineResult {
  chapter_title: string;
  outline: string;
  estimated_duration_min: number;
  grounded_by_docs?: boolean;
  context_chunk_count?: number;
}

export interface QuizContentResult {
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  quiz_content: string;
  grounded_by_docs?: boolean;
  context_chunk_count?: number;
}

export interface AnnouncementResult {
  subject: string;
  tone: 'formal' | 'friendly' | 'motivational';
  announcement: string;
  grounded_by_docs?: boolean;
  context_chunk_count?: number;
}

export interface PublishQuizBankResult {
  course_id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  saved_question_count: number;
  message: string;
}

export interface TeacherQuizBankItem {
  id: string;
  course_id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_count: number;
  quiz_content: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface TeacherQuizBankListResult {
  items: TeacherQuizBankItem[];
}

// ── Service ──────────────────────────────────────────────────────────────────

class CopilotService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
  }

  async generateLessonOutline(
    courseId: string,
    chapterTitle: string,
    options?: {
      learningObjectives?: string;
      audienceLevel?: 'beginner' | 'intermediate' | 'advanced';
    }
  ): Promise<LessonOutlineResult> {
    const response = await fetch(`${API_URL}/learning/teacher/generate-lesson-outline`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        chapter_title: chapterTitle,
        learning_objectives: options?.learningObjectives,
        audience_level: options?.audienceLevel ?? 'intermediate',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to generate lesson outline');
    }

    return response.json();
  }

  async generateQuizContent(
    courseId: string,
    topic: string,
    options?: {
      questionCount?: number;
      difficulty?: 'easy' | 'medium' | 'hard';
    }
  ): Promise<QuizContentResult> {
    const response = await fetch(`${API_URL}/learning/teacher/generate-quiz-content`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        topic,
        question_count: options?.questionCount ?? 5,
        difficulty: options?.difficulty ?? 'medium',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to generate quiz content');
    }

    return response.json();
  }

  async generateAnnouncement(
    courseId: string,
    subject: string,
    options?: {
      tone?: 'formal' | 'friendly' | 'motivational';
      extraContext?: string;
    }
  ): Promise<AnnouncementResult> {
    const response = await fetch(`${API_URL}/learning/teacher/generate-announcement`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        subject,
        tone: options?.tone ?? 'friendly',
        extra_context: options?.extraContext,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to generate announcement');
    }

    return response.json();
  }

  async publishQuizBank(
    courseId: string,
    topic: string,
    difficulty: 'easy' | 'medium' | 'hard',
    quizContent: string,
  ): Promise<PublishQuizBankResult> {
    const response = await fetch(`${API_URL}/learning/teacher/quiz-bank/publish`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        topic,
        difficulty,
        quiz_content: quizContent,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to publish quiz bank');
    }

    return response.json();
  }

  async listQuizBanks(courseId: string): Promise<TeacherQuizBankListResult> {
    const response = await fetch(`${API_URL}/learning/teacher/quiz-bank?course_id=${encodeURIComponent(courseId)}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to load quiz banks');
    }

    return response.json();
  }

  async updateQuizBank(
    bankId: string,
    payload: { topic: string; difficulty: 'easy' | 'medium' | 'hard'; quizContent: string },
  ): Promise<TeacherQuizBankItem> {
    const response = await fetch(`${API_URL}/learning/teacher/quiz-bank/${encodeURIComponent(bankId)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        topic: payload.topic,
        difficulty: payload.difficulty,
        quiz_content: payload.quizContent,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to update quiz bank');
    }

    return response.json();
  }

  async deleteQuizBank(bankId: string): Promise<{ message: string; id: string }> {
    const response = await fetch(`${API_URL}/learning/teacher/quiz-bank/${encodeURIComponent(bankId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(err.detail || 'Failed to delete quiz bank');
    }

    return response.json();
  }
}

export const copilotService = new CopilotService();

