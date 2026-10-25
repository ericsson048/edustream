import { apiClient } from './apiClient';
import type { AuthUser } from '../types/auth';

export interface Institution {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  country: string;
  website: string;
  is_active: boolean;
  created_at: string;
  members_count: number;
  admin?: {
    email: string;
    full_name: string;
    must_change_password?: boolean;
  };
}

export interface CourseAccessStudent {
  access_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  avatar_url: string;
  granted_at: string;
}

export const institutionService = {
  async uploadLogo(file: File, onProgress?: (percent: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<{ url: string }>('/upload-image/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: event => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    const uploadedUrl = new URL(data.url, window.location.origin);
    return `${uploadedUrl.pathname}${uploadedUrl.search}${uploadedUrl.hash}`;
  },

  // ── Institutions (admin) ──────────────────────────────────────────────────
  async listInstitutions(): Promise<Institution[]> {
    const { data } = await apiClient.get<Institution[]>('/auth/institutions/');
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async getInstitution(id: string): Promise<Institution> {
    const { data } = await apiClient.get<Institution>(`/auth/institutions/${id}/`);
    return data;
  },

  async createInstitution(payload: Partial<Institution> & {
    admin?: { full_name: string; email: string };
  }): Promise<Institution> {
    const { data } = await apiClient.post<Institution>('/auth/institutions/', payload);
    return data;
  },

  async updateInstitution(id: string, payload: Partial<Institution>): Promise<Institution> {
    const { data } = await apiClient.patch<Institution>(`/auth/institutions/${id}/`, payload);
    return data;
  },

  async deleteInstitution(id: string): Promise<void> {
    await apiClient.delete(`/auth/institutions/${id}/`);
  },

  // ── Institution members ───────────────────────────────────────────────────
  async listMembers(institutionId: string, role?: string): Promise<AuthUser[]> {
    const params = role ? { role } : {};
    const { data } = await apiClient.get<AuthUser[]>(`/auth/institutions/${institutionId}/members/`, { params });
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async createMember(institutionId: string, payload: { email: string; full_name: string; role: 'INSTRUCTOR' | 'STUDENT' }): Promise<AuthUser & { credentials_email_sent: boolean }> {
    const { data } = await apiClient.post<AuthUser & { credentials_email_sent: boolean }>(`/auth/institutions/${institutionId}/members/`, payload);
    return data;
  },

  // ── Instructor: manage students ───────────────────────────────────────────
  async listMyStudents(): Promise<AuthUser[]> {
    const { data } = await apiClient.get<AuthUser[]>('/auth/instructor/students/');
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async createStudent(payload: { email: string; full_name: string }): Promise<AuthUser> {
    const { data } = await apiClient.post<AuthUser>('/auth/instructor/students/create/', payload);
    return data;
  },

  // ── Course access ─────────────────────────────────────────────────────────
  async listCourseAccessStudents(courseId: string): Promise<CourseAccessStudent[]> {
    const { data } = await apiClient.get<CourseAccessStudent[]>(`/auth/courses/${courseId}/access/`);
    return Array.isArray(data) ? data : [];
  },

  async grantCourseAccess(courseId: string, studentIds: string[]): Promise<{ granted: string[]; already_had_access: string[] }> {
    const { data } = await apiClient.post(`/auth/courses/${courseId}/grant-access/`, { student_ids: studentIds });
    return data;
  },

  async revokeCourseAccess(courseId: string, studentId: string): Promise<void> {
    await apiClient.post(`/auth/courses/${courseId}/revoke-access/`, { student_id: studentId });
  },
};
