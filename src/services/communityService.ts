import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
import { buildWebSocketUrl } from './realtime';

export interface DiscussionItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  likes_count: number;
  author_name?: string;
}

export interface StudyGroupItem {
  id: string;
  name: string;
  description: string;
  next_session_at?: string | null;
  members_count?: number;
}

export interface StudyGroupMessageItem {
  id: string;
  group: string;
  sender: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

export const communityService = {
  async listDiscussions(): Promise<DiscussionItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<DiscussionItem>>('/discussions/');
    return data.results ?? [];
  },
  async listStudyGroups(): Promise<StudyGroupItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<StudyGroupItem>>('/study-groups/');
    return data.results ?? [];
  },
  async createDiscussion(payload: { title: string; content: string; category?: string; tags?: string[] }): Promise<DiscussionItem> {
    const { data } = await apiClient.post<DiscussionItem>('/discussions/', {
      title: payload.title,
      content: payload.content,
      category: payload.category || 'General',
      tags: payload.tags || [],
    });
    return data;
  },
  async createStudyGroup(payload: { name: string; description: string }): Promise<StudyGroupItem> {
    const { data } = await apiClient.post<StudyGroupItem>('/study-groups/', payload);
    return data;
  },
  async joinStudyGroup(groupId: string): Promise<{ joined: boolean; members_count: number }> {
    const { data } = await apiClient.post<{ joined: boolean; members_count: number }>(`/study-groups/${groupId}/join/`);
    return data;
  },
  async listStudyGroupMessages(groupId: string): Promise<StudyGroupMessageItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<StudyGroupMessageItem>>(`/study-group-messages/?group=${groupId}`);
    return data.results ?? [];
  },
  async sendStudyGroupMessage(group: string, content: string): Promise<StudyGroupMessageItem> {
    const { data } = await apiClient.post<StudyGroupMessageItem>('/study-group-messages/', { group, content });
    return data;
  },
  createCommunitySocket(): WebSocket {
    return new WebSocket(buildWebSocketUrl('/ws/community/'));
  },
  createStudyGroupSocket(groupId: string): WebSocket {
    return new WebSocket(buildWebSocketUrl(`/ws/community/groups/${groupId}/`));
  },
};
