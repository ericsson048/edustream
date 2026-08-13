import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
import { buildWebSocketUrl } from './realtime';

export interface LiveSessionItem {
  id: string;
  course: string | null;
  course_title?: string | null;
  instructor_id?: string;
  instructor_name?: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  is_public?: boolean;
  requires_permission?: boolean;
  enrolled_students?: number;
  room_name?: string;
  stream_minutes_remaining?: number | null;
}

export interface LiveParticipantItem {
  id: string;
  session: string;
  user: string;
  user_name?: string;
  role: 'HOST' | 'CO_HOST' | 'STUDENT';
  is_admitted?: boolean;
  is_mic_on?: boolean;
  is_camera_on?: boolean;
  is_screen_sharing?: boolean;
  hand_raised?: boolean;
  is_recording?: boolean;
  last_reaction?: string;
  joined_at?: string;
  left_at?: string | null;
}

export interface LiveChatMessage {
  id: string;
  session: string;
  user: string;
  user_name?: string;
  content: string;
  created_at?: string;
}

export const liveService = {
  async listLiveSessions(): Promise<LiveSessionItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<LiveSessionItem>>('/live-sessions/');
    return data.results ?? [];
  },
  async createLiveSession(payload: {
    course?: string | null;
    title: string;
    scheduled_at: string;
    duration_minutes: number;
    status?: LiveSessionItem['status'];
    is_public?: boolean;
    requires_permission?: boolean;
  }): Promise<LiveSessionItem> {
    const { data } = await apiClient.post<LiveSessionItem>('/live-sessions/', payload);
    return data;
  },
  async updateLiveSession(
    id: string,
    payload: Partial<Pick<LiveSessionItem, 'title' | 'scheduled_at' | 'duration_minutes' | 'status' | 'requires_permission'>>,
  ): Promise<LiveSessionItem> {
    const { data } = await apiClient.patch<LiveSessionItem>(`/live-sessions/${id}/`, payload);
    return data;
  },
  async goLive(id: string): Promise<void> {
    await apiClient.post(`/live-sessions/${id}/go-live/`);
  },
  async endLiveSession(id: string): Promise<void> {
    await apiClient.post(`/live-sessions/${id}/end/`);
  },
  async joinSession(id: string): Promise<LiveParticipantItem> {
    const { data } = await apiClient.post<LiveParticipantItem>(`/live-sessions/${id}/join/`);
    return data;
  },
  async requestEntry(id: string): Promise<void> {
    await apiClient.post(`/live-sessions/${id}/request-entry/`);
  },
  async grantEntry(id: string, userId: string): Promise<LiveParticipantItem> {
    const { data } = await apiClient.post<LiveParticipantItem>(`/live-sessions/${id}/grant-entry/`, { user_id: userId });
    return data;
  },
  async denyEntry(id: string, userId: string): Promise<void> {
    await apiClient.post(`/live-sessions/${id}/deny-entry/`, { user_id: userId });
  },
  async sendToWaiting(id: string, userId: string): Promise<LiveParticipantItem> {
    const { data } = await apiClient.post<LiveParticipantItem>(`/live-sessions/${id}/send-to-waiting/`, { user_id: userId });
    return data;
  },
  async addCohost(id: string, userId: string): Promise<LiveParticipantItem> {
    const { data } = await apiClient.post<LiveParticipantItem>(`/live-sessions/${id}/add-cohost/`, { user_id: userId });
    return data;
  },
  async pendingEntries(id: string): Promise<LiveParticipantItem[]> {
    const { data } = await apiClient.get<LiveParticipantItem[]>(`/live-sessions/${id}/pending-entries/`);
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
  async listChatMessages(sessionId: string): Promise<LiveChatMessage[]> {
    const { data } = await apiClient.get<PaginatedResponse<LiveChatMessage>>(
      `/live-chat-messages/?session=${sessionId}`,
    );
    return data.results ?? [];
  },
  async uploadRecording(sessionId: string, blob: Blob): Promise<{ url: string; file: string }> {
    const formData = new FormData();
    formData.append('file', blob, `recording-${sessionId}.webm`);
    const { data } = await apiClient.post<{ url: string; file: string }>(
      `/live-sessions/${sessionId}/upload-recording/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },
};
