import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
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

export interface TutorMessageItem {
  id: string;
  prompt: string;
  response: string;
  created_at: string;
  conversation: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReasoningResult {
  content: string;
  reasoning_details?: Record<string, unknown>;
  role: string;
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
  async listConversations(): Promise<ConversationItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<ConversationItem>>('/ai/tutor/conversations/');
    return data.results ?? [];
  },
  async createConversation(title?: string): Promise<ConversationItem> {
    const { data } = await apiClient.post<ConversationItem>('/ai/tutor/conversations/', { title: title || 'New conversation' });
    return data;
  },
  async updateConversation(id: string, payload: { title: string }): Promise<ConversationItem> {
    const { data } = await apiClient.patch<ConversationItem>(`/ai/tutor/conversations/${id}/`, payload);
    return data;
  },
  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/ai/tutor/conversations/${id}/`);
  },
  async listMessages(conversationId: string): Promise<TutorMessageItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<TutorMessageItem>>(`/ai/tutor/messages/?conversation=${conversationId}`);
    return data.results ?? [];
  },
  async askTutor(prompt: string, conversation_id?: string): Promise<{ response: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
    const { data } = await apiClient.post<{ response: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }>('/ai/tutor/chat/', { prompt, conversation_id });
    return data;
  },
  async askTutorWithReasoning(prompt: string, history?: { role: string; content: string; reasoning_details?: Record<string, unknown> }[]): Promise<ReasoningResult> {
    const { data } = await apiClient.post<ReasoningResult>('/ai/tutor/reasoning/', { prompt, history });
    return data;
  },
  async continueReasoning(followUp: string, assistantMessage: { content: string; reasoning_details?: Record<string, unknown> }, history?: { role: string; content: string; reasoning_details?: Record<string, unknown> }[]): Promise<ReasoningResult> {
    const { data } = await apiClient.post<ReasoningResult>('/ai/tutor/reasoning/', { follow_up: followUp, assistant_message: assistantMessage, history });
    return data;
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
