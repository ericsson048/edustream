import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

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
};
