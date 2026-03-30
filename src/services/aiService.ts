import { apiClient } from './apiClient';
import { buildWebSocketUrl } from './realtime';

export interface GeneratedCourseOutline {
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  learning_objectives?: string[];
  prerequisites?: string[];
  price: string;
  modules: Array<{
    title: string;
    resources?: Array<{
      title: string;
      kind: 'PDF' | 'LINK' | 'ZIP' | 'OTHER';
      description: string;
      file_url: string;
    }>;
    lessons: Array<{
      title: string;
      content: string;
      video_url: string;
      duration_seconds: number;
      resources?: Array<{
        title: string;
        kind: 'PDF' | 'LINK' | 'ZIP' | 'OTHER';
        description: string;
        file_url: string;
      }>;
    }>;
    quiz?: {
      title: string;
      passing_score: number;
      time_limit_minutes: number;
      questions: Array<{
        prompt: string;
        options: string[];
        correct_index: number;
      }>;
    };
  }>;
}

export interface GeneratedQuizPackage {
  title: string;
  passing_score: number;
  time_limit_minutes: number;
  questions: Array<{
    prompt: string;
    options: string[];
    correct_index: number;
  }>;
}

export interface GeneratedLessonPackage {
  title: string;
  content: string;
  lesson_type: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE' | 'DOWNLOAD';
  status: 'DRAFT' | 'PUBLISHED';
  video_url: string;
  transcript: string;
  instructor_notes: string;
  duration_seconds: number;
  is_preview: boolean;
  quiz: GeneratedQuizPackage;
}

export interface GeneratedModulePackage {
  title: string;
  description: string;
  learning_objectives: string[];
  estimated_minutes: number;
  is_published: boolean;
  lessons: GeneratedLessonPackage[];
  quiz: GeneratedQuizPackage;
}

export const aiService = {
  async askTutor(prompt: string): Promise<string> {
    const { data } = await apiClient.post<{ response: string }>('/ai/tutor/chat/', { prompt });
    return data.response;
  },
  async generateCourse(payload: { prompt: string; title?: string; category?: string; level?: string }): Promise<GeneratedCourseOutline> {
    const { data } = await apiClient.post<GeneratedCourseOutline>('/ai/instructor/generate-course/', payload);
    return data;
  },
  async generateModule(payload: {
    prompt: string;
    course_title: string;
    category?: string;
    level?: string;
    module_title?: string;
  }): Promise<GeneratedModulePackage> {
    const { data } = await apiClient.post<GeneratedModulePackage>('/ai/instructor/generate-module/', payload);
    return data;
  },
  async generateLesson(payload: {
    prompt: string;
    course_title: string;
    category?: string;
    level?: string;
    module_title: string;
    lesson_title?: string;
  }): Promise<GeneratedLessonPackage> {
    const { data } = await apiClient.post<GeneratedLessonPackage>('/ai/instructor/generate-lesson/', payload);
    return data;
  },
  createTutorSocket(): WebSocket {
    return new WebSocket(buildWebSocketUrl('/ws/ai/tutor/'));
  },
};
