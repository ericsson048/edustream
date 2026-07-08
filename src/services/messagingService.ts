import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';
import { buildWebSocketUrl } from './realtime';

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

export interface ContactItem {
  id: string;
  full_name: string;
  role: string;
  avatar_url: string;
  title: string;
  course_names: string[];
  last_seen: string | null;
  is_online: boolean;
}

export interface MessageItem {
  id: string;
  conversation: string;
  sender_name?: string;
  content: string;
  created_at: string;
  is_read?: boolean;
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
  async createConversation(name: string): Promise<ConversationItem> {
    const { data } = await apiClient.post<ConversationItem>('/conversations/', { name, is_group: true });
    return data;
  },
  async sendMessage(conversation: string, content: string): Promise<MessageItem> {
    const { data } = await apiClient.post<MessageItem>('/messages/', { conversation, content });
    return data;
  },
  async markConversationRead(conversationId: string): Promise<void> {
    await apiClient.post(`/conversations/${conversationId}/mark_read/`);
  },
  async listContacts(): Promise<ContactItem[]> {
    const { data } = await apiClient.get<ContactItem[]>('/contacts/');
    return data;
  },
  createConversationSocket(conversationId: string): WebSocket {
    return new WebSocket(buildWebSocketUrl(`/ws/messages/${conversationId}/`));
  },
};
