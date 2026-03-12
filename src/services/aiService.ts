import { apiClient } from './apiClient';

export const aiService = {
  async askTutor(prompt: string): Promise<string> {
    const { data } = await apiClient.post<{ response: string }>('/ai/tutor/chat/', { prompt });
    return data.response;
  },
};
