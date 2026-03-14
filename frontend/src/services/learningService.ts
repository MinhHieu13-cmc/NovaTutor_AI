import { authService } from './authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface StudentWeeklyScore {
  week_label: string;
  score: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

export interface GeneratedAdaptiveQuiz {
  quiz_id: string;
  topic: string;
  topic_source: 'weak_topic' | 'session_goal' | 'course_subject' | 'manual';
  difficulty: 'easy' | 'medium' | 'hard';
  difficulty_reason: string;
  question_source: 'teacher_bank' | 'hybrid' | 'adaptive_template';
  questions: QuizQuestion[];
}

export interface SubmittedAdaptiveQuiz {
  quiz_id: string;
  topic: string;
  score: number;
  correct_count: number;
  total_questions: number;
  mastery_score: number;
}

export interface StudentProgress {
  streak_days: number;
  weak_topics: string[];
  next_suggestion: string;
  weekly_scores: StudentWeeklyScore[];
}

export interface AtRiskStudent {
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  avg_score_21d?: number | null;
  last_activity_at?: string | null;
  weak_topic?: string | null;
  risk_level: 'high' | 'medium';
  reason: string;
}

export interface TeacherAtRiskResponse {
  students: AtRiskStudent[];
}

export interface CourseStats {
  course_id: string;
  course_name: string;
  student_count: number;
}

export interface TeacherStatsResponse {
  total_courses: number;
  total_students: number;
  courses: CourseStats[];
}

class LearningService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
  }

  async getStudentProgress(courseId?: string): Promise<StudentProgress> {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    const response = await fetch(`${API_URL}/learning/student/progress${query}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch student progress');
    }

    return await response.json();
  }

  async generateAdaptiveQuiz(courseId: string, topic?: string, sessionGoal?: string): Promise<GeneratedAdaptiveQuiz> {
    const response = await fetch(`${API_URL}/learning/quiz/generate`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        course_id: courseId,
        topic,
        session_goal: sessionGoal,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate adaptive quiz');
    }

    return await response.json();
  }

  async submitAdaptiveQuiz(quizId: string, answers: number[]): Promise<SubmittedAdaptiveQuiz> {
    const response = await fetch(`${API_URL}/learning/quiz/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        quiz_id: quizId,
        answers,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit adaptive quiz');
    }

    return await response.json();
  }

  async getTeacherAtRisk(courseId?: string): Promise<TeacherAtRiskResponse> {
    const query = courseId ? `?course_id=${encodeURIComponent(courseId)}` : '';
    const response = await fetch(`${API_URL}/learning/teacher/at-risk${query}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch teacher at-risk insights');
    }

    return await response.json();
  }

  async getTeacherStats(): Promise<TeacherStatsResponse> {
    const response = await fetch(`${API_URL}/learning/teacher/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to fetch teacher stats');
    }

    return await response.json();
  }
}

export const learningService = new LearningService();


