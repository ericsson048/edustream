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

export interface PlanItem {
  id: string;
  name: string;
  price_monthly: string;
  stripe_price_id: string;
  features: string[];
  badge: string;
  audience: 'STUDENT' | 'INSTRUCTOR';
  has_unlimited_ai: boolean;
  has_unlimited_streams: boolean;
  stream_minutes_monthly: number;
  ai_monthly_limit: number;
  is_active: boolean;
}

export interface PlatformSetting {
  key: string;
  value: string;
}

export const adminService = {
  async listUsers(params?: { search?: string; role?: string; is_active?: string }): Promise<AuthUser[]> {
    const { data } = await apiClient.get<PaginatedResponse<AuthUser>>('/auth/users/', { params });
    return data.results ?? [];
  },
  async updateUser(id: string, payload: Partial<Pick<AuthUser, 'role' | 'is_active'>>): Promise<AuthUser> {
    const { data } = await apiClient.patch<AuthUser>(`/auth/users/${id}/`, payload);
    return data;
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
  async createSupportTicket(payload: { subject: string; message: string; priority: SupportTicket['priority'] }): Promise<SupportTicket> {
    const { data } = await apiClient.post<SupportTicket>('/admin/support/tickets/', payload);
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
  async broadcastNotification(payload: { title: string; body: string; notification_type?: string; target_role?: string }): Promise<void> {
    await apiClient.post('/admin/notifications/broadcast/', payload);
  },
  async listPlans(): Promise<PlanItem[]> {
    const { data } = await apiClient.get<PlanItem[]>('/billing/admin/plans/');
    return data;
  },
  async createPlan(payload: Partial<PlanItem>): Promise<PlanItem> {
    const { data } = await apiClient.post<PlanItem>('/billing/admin/plans/', payload);
    return data;
  },
  async updatePlan(id: string, payload: Partial<PlanItem>): Promise<PlanItem> {
    const { data } = await apiClient.patch<PlanItem>(`/billing/admin/plans/${id}/`, payload);
    return data;
  },
  async deletePlan(id: string): Promise<void> {
    await apiClient.delete(`/billing/admin/plans/${id}/`);
  },
  async refundTransaction(id: string): Promise<void> {
    await apiClient.post(`/billing/transactions/${id}/refund/`);
  },
};
