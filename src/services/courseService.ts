import { apiClient } from './apiClient';
import type { Course, Enrollment } from '../types/lms';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const courseService = {
  async listCourses(): Promise<Course[]> {
    const { data } = await apiClient.get<PaginatedResponse<Course>>('/courses/');
    return data.results ?? [];
  },

  async getCourse(id: string): Promise<Course> {
    const { data } = await apiClient.get<Course>(`/courses/${id}/`);
    return data;
  },

  async listEnrollments(): Promise<Enrollment[]> {
    const { data } = await apiClient.get<PaginatedResponse<Enrollment>>('/enrollments/');
    return data.results ?? [];
  },
};
