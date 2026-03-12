import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export interface AssignmentItem {
  id: string;
  title: string;
  course: string;
  due_date: string;
  points: number;
  type: string;
}

export interface SubmissionItem {
  id: string;
  assignment: string;
  student: string;
  grade?: string | null;
  status: string;
  submitted_at: string;
  feedback?: string;
}

export const learningService = {
  async listAssignments(): Promise<AssignmentItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<AssignmentItem>>('/assignments/');
    return data.results ?? [];
  },
  async listSubmissions(): Promise<SubmissionItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<SubmissionItem>>('/submissions/');
    return data.results ?? [];
  },
};
