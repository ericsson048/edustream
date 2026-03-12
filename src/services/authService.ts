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

  async updateMe(payload: Partial<Pick<AuthUser, 'full_name' | 'email'>>): Promise<AuthUser> {
    const { data } = await apiClient.patch<AuthUser>('/auth/me/', payload);
    return data;
  },

  logout(): void {
    tokenStorage.clearTokens();
  },
};
