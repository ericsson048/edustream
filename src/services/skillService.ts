import { apiClient } from './apiClient';
import type { PaginatedResponse } from './common';

export interface Skill {
  id: string;
  title: string;
  description: string;
  icon: string;
  position_x: number;
  position_y: number;
  order: number;
  related_courses: string[];
  is_active: boolean;
}

export interface UserSkill {
  id: string;
  user: string;
  skill: string;
  skill_title: string;
  skill_position_x: number;
  skill_position_y: number;
  status: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED';
  completed_at: string | null;
}

export const skillService = {
  async listSkills(): Promise<Skill[]> {
    const { data } = await apiClient.get<PaginatedResponse<Skill>>('/skills/');
    return data.results ?? [];
  },
  async listUserSkills(): Promise<UserSkill[]> {
    const { data } = await apiClient.get<PaginatedResponse<UserSkill>>('/user-skills/');
    return data.results ?? [];
  },
  async createUserSkill(skillId: string, status: UserSkill['status'] = 'IN_PROGRESS'): Promise<UserSkill> {
    const { data } = await apiClient.post<UserSkill>('/user-skills/', { skill: skillId, status });
    return data;
  },
  async updateUserSkill(id: string, status: UserSkill['status']): Promise<UserSkill> {
    const { data } = await apiClient.patch<UserSkill>(`/user-skills/${id}/`, { status });
    return data;
  },
};
