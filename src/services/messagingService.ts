import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export interface ConversationItem {
  id: string;
  name: string;
  is_group: boolean;
  latest_message?: {
    id: string;
    content: string;
    sender_name?: string;
    created_at: string;
  } | null;
}

export interface MessageItem {
  id: string;
  conversation: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

export const messagingService = {
  async listConversations(): Promise<ConversationItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<ConversationItem>>('/conversations/');
    return data.results ?? [];
  },
  async listMessages(conversationId: string): Promise<MessageItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<MessageItem>>(`/messages/?conversation=${conversationId}`);
    return data.results ?? [];
  },
};
