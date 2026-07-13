import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export type NotificationType = 'COURSE_UPDATE' | 'ASSIGNMENT' | 'GRADE' | 'MESSAGE' | 'SKILL_UNLOCK' | 'SYSTEM';

export interface Notification {
  id: string;
  user: string;
  notification_type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export const notificationService = {
  async list(params?: { page?: number; notification_type?: string; is_read?: boolean }): Promise<PaginatedResponse<Notification>> {
    const { data } = await apiClient.get<PaginatedResponse<Notification>>('/notifications/', { params });
    return data;
  },

  async markRead(id: string): Promise<Notification> {
    const { data } = await apiClient.patch<Notification>(`/notifications/${id}/mark_read/`);
    return data;
  },

  async markAllRead(): Promise<void> {
    await apiClient.post('/notifications/mark_all_read/');
  },

  async unreadCount(): Promise<number> {
    const { data } = await apiClient.get<{ count: number }>('/notifications/unread_count/');
    return data.count;
  },
};
