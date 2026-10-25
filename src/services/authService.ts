import { apiClient } from './apiClient';
import { tokenStorage } from './tokenStorage';
import type { AuthUser, LoginResponse, RegisterPayload } from '../types/auth';

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const { data } = await apiClient.post<LoginResponse>('/auth/login/', { email, password });
    tokenStorage.setTokens(data.access, data.refresh);
    return this.getMe();
  },

  async register(payload: RegisterPayload): Promise<AuthUser> {
    await apiClient.post('/auth/register/', payload);
    return this.login(payload.email, payload.password);
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>('/auth/me/');
    return data;
  },

  async getUser(id: string): Promise<AuthUser> {
    const { data } = await apiClient.get<AuthUser>(`/auth/users/${id}/`);
    return data;
  },

  async updateMe(payload: Partial<Pick<AuthUser, 'full_name' | 'email' | 'title' | 'bio' | 'location' | 'website' | 'avatar_url'>>): Promise<AuthUser> {
    const { data } = await apiClient.patch<AuthUser>('/auth/me/', payload);
    return data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password/', { current_password: currentPassword, new_password: newPassword });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password/', { email });
  },

  async resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password/', {
      email,
      otp,
      new_password: newPassword,
    });
  },

  async verifyEmail(userId: string, token: string): Promise<void> {
    await apiClient.post('/auth/verify-email/', { user_id: userId, token });
  },

  async resendVerification(): Promise<void> {
    await apiClient.post('/auth/resend-verification/', {});
  },

  async getPublicStats(): Promise<{ total_courses: number; total_instructors: number; total_students: number; total_payouts: number }> {
    const { data } = await apiClient.get('/auth/public/stats/');
    return data;
  },

  async getMyStats(): Promise<{
    courses_enrolled: number;
    courses_completed: number;
    certificates_count: number;
    assignments_submitted: number;
    quiz_attempts: number;
    total_focus_minutes: number;
    streak_days: number;
  }> {
    const { data } = await apiClient.get('/auth/me/stats/');
    return data;
  },

  async getMyPreferences(): Promise<Record<string, boolean>> {
    const { data } = await apiClient.get('/auth/me/preferences/');
    return data;
  },

  async updateMyPreferences(payload: Record<string, boolean>): Promise<Record<string, boolean>> {
    const { data } = await apiClient.patch('/auth/me/preferences/', payload);
    return data;
  },

  async logout(): Promise<void> {
    const refresh = tokenStorage.getRefreshToken();
    tokenStorage.clearTokens();
    if (!refresh) return;
    try {
      await apiClient.post('/auth/logout/', { refresh });
    } catch {
      // Local logout still succeeds if the backend is unreachable.
    }
  },
};
