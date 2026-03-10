// Course Service - GCP Backend Integration
import { authService } from './authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface Course {
  id: string;
  teacher_id: string;
  name: string;
  description: string;
  subject: string;
  voice_config: {
    voice_name: string;
    language: string;
    speed: number;
    pitch: number;
  };
  created_at: string;
  updated_at?: string;
}

export interface CourseCreateData {
  name: string;
  description: string;
  subject: string;
}

export interface VoiceConfig {
  voice_name: string;
  language: string;
  speed: number;
  pitch: number;
}

export interface CourseDocument {
  id: string;
  course_id: string;
  document_url: string;
  document_name: string;
  document_type: string;
  uploaded_at: string;
}

class CourseService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...authService.getAuthHeaders(),
    };
  }

  // Teacher: Create course
  async createCourse(data: CourseCreateData): Promise<Course> {
    const user = authService.getUser();
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can create courses');
    }

    const response = await fetch(
      `${API_URL}/courses/create?teacher_id=${user.id}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create course');
    }

    return await response.json();
  }

  // Teacher: Get my courses
  async getTeacherCourses(): Promise<Course[]> {
    const user = authService.getUser();
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can view their courses');
    }

    const response = await fetch(
      `${API_URL}/courses/my-courses?teacher_id=${user.id}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch courses');
    }

    return await response.json();
  }

  // Teacher: Update course
  async updateCourse(
    courseId: string,
    data: Partial<CourseCreateData>
  ): Promise<Course> {
    const user = authService.getUser();
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can update courses');
    }

    const response = await fetch(
      `${API_URL}/courses/${courseId}?teacher_id=${user.id}`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update course');
    }

    return await response.json();
  }

  // Teacher: Delete course
  async deleteCourse(courseId: string): Promise<void> {
    const user = authService.getUser();
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can delete courses');
    }

    const response = await fetch(
      `${API_URL}/courses/${courseId}?teacher_id=${user.id}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete course');
    }
  }

  // Teacher: Upload document
  async uploadDocument(
    courseId: string,
    file: File
  ): Promise<CourseDocument> {
    const user = authService.getUser();
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can upload documents');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(
      `${API_URL}/courses/${courseId}/upload-document?teacher_id=${user.id}`,
      {
        method: 'POST',
        headers: authService.getAuthHeaders(),
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to upload document');
    }

    const result = await response.json();
    return result.document;
  }

  // Teacher: Configure voice
  async configureVoice(
    courseId: string,
    voiceConfig: VoiceConfig
  ): Promise<void> {
    const user = authService.getUser();
    if (!user || user.role !== 'teacher') {
      throw new Error('Only teachers can configure voice');
    }

    const response = await fetch(
      `${API_URL}/courses/${courseId}/configure-voice?teacher_id=${user.id}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(voiceConfig),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to configure voice');
    }
  }

  // Student: Get available courses
  async getAvailableCourses(): Promise<Course[]> {
    const response = await fetch(`${API_URL}/courses/available`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch available courses');
    }

    return await response.json();
  }

  // Student: Enroll in course
  async enrollInCourse(courseId: string): Promise<void> {
    const user = authService.getUser();
    if (!user || user.role !== 'student') {
      throw new Error('Only students can enroll in courses');
    }

    const response = await fetch(
      `${API_URL}/courses/${courseId}/enroll?student_id=${user.id}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({}),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to enroll in course');
    }
  }

  // Student: Get my courses
  async getStudentCourses(): Promise<Course[]> {
    const user = authService.getUser();
    if (!user || user.role !== 'student') {
      throw new Error('Only students can view enrolled courses');
    }

    const response = await fetch(
      `${API_URL}/courses/my-courses-student?student_id=${user.id}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch enrolled courses');
    }

    return await response.json();
  }

  // Get course documents
  async getCourseDocuments(courseId: string): Promise<CourseDocument[]> {
    const response = await fetch(
      `${API_URL}/courses/${courseId}/documents`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch documents');
    }

    return await response.json();
  }
}

export const courseService = new CourseService();

