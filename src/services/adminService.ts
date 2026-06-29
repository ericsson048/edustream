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

export interface DashboardStats {
  total_users: number;
  total_instructors: number;
  total_students: number;
  active_courses: number;
  total_revenue: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  kind: string;
  description: string;
  timestamp: string;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  payouts: number;
}

export interface RevenueReport {
  monthly: RevenuePoint[];
  summary: {
    total_revenue: number;
    total_payouts: number;
    platform_profit: number;
    margin: number;
    pending_payouts: number;
  };
}

export interface SupportTicket {
  id: string;
  user: string;
  user_full_name: string;
  user_email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  updated_at: string;
}

export interface PlatformSetting {
  key: string;
  value: string;
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
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await apiClient.get<DashboardStats>('/admin/dashboard/stats/');
    return data;
  },
  async getRevenueReport(params?: { months?: number }): Promise<RevenueReport> {
    const { data } = await apiClient.get<RevenueReport>('/admin/reports/revenue/', { params });
    return data;
  },
  async listSupportTickets(): Promise<SupportTicket[]> {
    const { data } = await apiClient.get<SupportTicket[] | PaginatedResponse<SupportTicket>>('/admin/support/tickets/');
    return Array.isArray(data) ? data : data.results ?? [];
  },
  async updateSupportTicket(id: string, payload: Partial<Pick<SupportTicket, 'status' | 'priority'>>): Promise<SupportTicket> {
    const { data } = await apiClient.patch<SupportTicket>(`/admin/support/tickets/${id}/`, payload);
    return data;
  },
  async getPlatformSettings(): Promise<PlatformSetting[]> {
    const { data } = await apiClient.get<PlatformSetting[] | PaginatedResponse<PlatformSetting>>('/admin/settings/');
    return Array.isArray(data) ? data : data.results ?? [];
  },
  async updatePlatformSetting(key: string, value: string): Promise<PlatformSetting> {
    const { data } = await apiClient.patch<PlatformSetting>(`/admin/settings/${key}/`, { value });
    return data;
  },
  async bulkUpdatePlatformSettings(settings: Record<string, string>): Promise<void> {
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        apiClient.patch(`/admin/settings/${key}/`, { value }),
      ),
    );
  },
};
