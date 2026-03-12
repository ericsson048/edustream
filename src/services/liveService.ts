import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export interface LiveSessionItem {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
}

export const liveService = {
  async listLiveSessions(): Promise<LiveSessionItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<LiveSessionItem>>('/live-sessions/');
    return data.results ?? [];
  },
};
