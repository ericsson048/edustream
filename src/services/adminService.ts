import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
import type { AuthUser } from '../types/auth';

export interface AdminTransaction {
  id: string;
  amount_paid: string;
  status: string;
  created_at: string;
  course_title?: string;
}

export const adminService = {
  async listUsers(): Promise<AuthUser[]> {
    const { data } = await apiClient.get<PaginatedResponse<AuthUser>>('/auth/users/');
    return data.results ?? [];
  },
  async listTransactions(): Promise<AdminTransaction[]> {
    const { data } = await apiClient.get<AdminTransaction[]>('/billing/transactions/');
    return data;
  },
};
