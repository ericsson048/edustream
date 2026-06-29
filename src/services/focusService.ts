import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export interface FocusSession {
  id: string;
  user: string;
  duration_seconds: number;
  mode: 'WORK' | 'BREAK';
  completed_at: string;
}

export interface FocusStats {
  total_focus_minutes: number;
  total_sessions: number;
}

export const focusService = {
  async listSessions(): Promise<FocusSession[]> {
    const { data } = await apiClient.get<PaginatedResponse<FocusSession>>('/focus-sessions/');
    return data.results ?? [];
  },
  async createSession(durationSeconds: number, mode: 'WORK' | 'BREAK'): Promise<FocusSession> {
    const { data } = await apiClient.post<FocusSession>('/focus-sessions/', { duration_seconds: durationSeconds, mode });
    return data;
  },
  async getStats(): Promise<FocusStats> {
    const { data } = await apiClient.get<FocusStats>('/focus-sessions/stats/');
    return data;
  },
};
