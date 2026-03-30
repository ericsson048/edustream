import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export interface AssignmentItem {
  id: string;
  course: string;
  course_title?: string;
  title: string;
  description: string;
  due_date: string;
  points: number;
  type: string;
}

export interface SubmissionItem {
  id: string;
  assignment: string;
  assignment_title?: string;
  student: string;
  student_name?: string;
  course_id?: string;
  course_title?: string;
  grade?: string | null;
  status: string;
  submitted_at: string;
  feedback?: string;
  content_text?: string;
  file_url?: string;
}

export interface QuizItem {
  id: string;
  lesson?: string | null;
  module?: string | null;
  course_id?: string | null;
  title: string;
  passing_score: number;
  time_limit_minutes: number;
  questions?: QuizQuestionItem[];
}

export interface QuizQuestionItem {
  id: string;
  quiz: string;
  prompt: string;
  options: string[];
  correct_index: number;
  order: number;
}

export interface QuizAttemptItem {
  id: string;
  quiz: string;
  student: string;
  answers: Record<string, number>;
  score: string;
  passed: boolean;
  started_at: string;
  submitted_at?: string | null;
}

export const learningService = {
  async listAssignments(): Promise<AssignmentItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<AssignmentItem>>('/assignments/');
    return data.results ?? [];
  },
  async listAssignmentsByCourse(courseId: string): Promise<AssignmentItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<AssignmentItem>>(`/assignments/?course=${courseId}`);
    return data.results ?? [];
  },
  async getAssignment(id: string): Promise<AssignmentItem> {
    const { data } = await apiClient.get<AssignmentItem>(`/assignments/${id}/`);
    return data;
  },
  async listSubmissions(): Promise<SubmissionItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<SubmissionItem>>('/submissions/');
    return data.results ?? [];
  },
  async createSubmission(payload: {
    assignment: string;
    content_text?: string;
    file_url?: string;
  }): Promise<SubmissionItem> {
    const { data } = await apiClient.post<SubmissionItem>('/submissions/', payload);
    return data;
  },
  async gradeSubmission(
    id: string,
    payload: {
      grade: string;
      feedback?: string;
      status?: string;
    },
  ): Promise<SubmissionItem> {
    const { data } = await apiClient.post<SubmissionItem>(`/submissions/${id}/grade/`, payload);
    return data;
  },
  async createAssignment(payload: {
    course: string;
    title: string;
    description: string;
    due_date: string;
    points: number;
    type: string;
  }): Promise<AssignmentItem> {
    const { data } = await apiClient.post<AssignmentItem>('/assignments/', payload);
    return data;
  },
  async updateAssignment(
    id: string,
    payload: Partial<Pick<AssignmentItem, 'title' | 'description' | 'due_date' | 'points' | 'type'>>,
  ): Promise<AssignmentItem> {
    const { data } = await apiClient.patch<AssignmentItem>(`/assignments/${id}/`, payload);
    return data;
  },
  async deleteAssignment(id: string): Promise<void> {
    await apiClient.delete(`/assignments/${id}/`);
  },
  async listQuizzesByModule(moduleId: string): Promise<QuizItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<QuizItem>>(`/quizzes/?module=${moduleId}`);
    return data.results ?? [];
  },
  async listQuizzesByLesson(lessonId: string): Promise<QuizItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<QuizItem>>(`/quizzes/?lesson=${lessonId}`);
    return data.results ?? [];
  },
  async getQuiz(id: string): Promise<QuizItem> {
    const { data } = await apiClient.get<QuizItem>(`/quizzes/${id}/`);
    return data;
  },
  async listQuizAttempts(params?: { quiz?: string; passed?: boolean }): Promise<QuizAttemptItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<QuizAttemptItem>>('/quiz-attempts/', { params });
    return data.results ?? [];
  },
  async submitQuizAttempt(payload: {
    quiz: string;
    answers: Record<string, number>;
  }): Promise<QuizAttemptItem> {
    const { data } = await apiClient.post<QuizAttemptItem>('/quiz-attempts/', payload);
    return data;
  },
  async createQuiz(payload: {
    title: string;
    module?: string;
    lesson?: string;
    passing_score?: number;
    time_limit_minutes?: number;
  }): Promise<QuizItem> {
    const { data } = await apiClient.post<QuizItem>('/quizzes/', payload);
    return data;
  },
  async updateQuiz(
    id: string,
    payload: Partial<Pick<QuizItem, 'title' | 'passing_score' | 'time_limit_minutes'>>,
  ): Promise<QuizItem> {
    const { data } = await apiClient.patch<QuizItem>(`/quizzes/${id}/`, payload);
    return data;
  },
  async createQuizQuestion(payload: {
    quiz: string;
    prompt: string;
    options: string[];
    correct_index: number;
    order: number;
  }): Promise<QuizQuestionItem> {
    const { data } = await apiClient.post<QuizQuestionItem>('/quiz-questions/', payload);
    return data;
  },
  async updateQuizQuestion(
    id: string,
    payload: Partial<Pick<QuizQuestionItem, 'prompt' | 'options' | 'correct_index' | 'order'>>,
  ): Promise<QuizQuestionItem> {
    const { data } = await apiClient.patch<QuizQuestionItem>(`/quiz-questions/${id}/`, payload);
    return data;
  },
  async deleteQuizQuestion(id: string): Promise<void> {
    await apiClient.delete(`/quiz-questions/${id}/`);
  },
  async deleteQuiz(id: string): Promise<void> {
    await apiClient.delete(`/quizzes/${id}/`);
  },
};
