import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
import { buildWebSocketUrl } from './realtime';

export interface LiveSessionItem {
  id: string;
  course: string;
  course_title?: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  enrolled_students?: number;
  room_name?: string;
}

export const liveService = {
  async listLiveSessions(): Promise<LiveSessionItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<LiveSessionItem>>('/live-sessions/');
    return data.results ?? [];
  },
  async createLiveSession(payload: {
    course: string;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    status?: LiveSessionItem['status'];
  }): Promise<LiveSessionItem> {
    const { data } = await apiClient.post<LiveSessionItem>('/live-sessions/', payload);
    return data;
  },
  async updateLiveSession(
    id: string,
    payload: Partial<Pick<LiveSessionItem, 'title' | 'scheduled_at' | 'duration_minutes' | 'status'>>,
  ): Promise<LiveSessionItem> {
    const { data } = await apiClient.patch<LiveSessionItem>(`/live-sessions/${id}/`, payload);
    return data;
  },
  createSessionSocket(sessionId: string): WebSocket {
    return new WebSocket(buildWebSocketUrl(`/ws/live/${sessionId}/`));
  },
};
