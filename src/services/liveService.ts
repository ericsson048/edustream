import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
import { buildWebSocketUrl } from './realtime';

export interface LiveSessionItem {
  id: string;
  course: string;
  course_title?: string;
  instructor_id?: string;
  instructor_name?: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  enrolled_students?: number;
  room_name?: string;
}

export interface LiveParticipantItem {
  id: string;
  session: string;
  user: string;
  user_name?: string;
  role: 'HOST' | 'STUDENT';
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  is_screen_sharing?: boolean;
  hand_raised?: boolean;
  is_recording?: boolean;
  last_reaction?: string;
  joined_at?: string;
  left_at?: string | null;
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
  async joinSession(id: string): Promise<LiveParticipantItem> {
    const { data } = await apiClient.post<LiveParticipantItem>(`/live-sessions/${id}/join/`);
    return data;
  },
  async listParticipants(sessionId: string): Promise<LiveParticipantItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<LiveParticipantItem>>(
      `/live-participants/?session=${sessionId}`,
    );
    return data.results ?? [];
  },
  createSessionSocket(sessionId: string): WebSocket {
    return new WebSocket(buildWebSocketUrl(`/ws/live/${sessionId}/`));
  },
};
