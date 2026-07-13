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

export interface SkillTreeNode {
  id: string;
  skill_tree: string;
  title: string;
  description: string;
  course: string | null;
  icon: string;
  position_x: number;
  position_y: number;
  order: number;
  depth: number;
  status: 'LOCKED' | 'UNLOCKED' | 'COMPLETED';
  completed_at: string | null;
}

export interface SkillTreeEdge {
  id: string;
  skill_tree: string;
  parent: string;
  child: string;
}

export interface SkillTreeData {
  id: string;
  user: string;
  title: string;
  description: string;
  is_active: boolean;
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
  created_at: string;
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

  // Dynamic Skill Tree
  async listSkillTrees(): Promise<SkillTreeData[]> {
    const { data } = await apiClient.get<PaginatedResponse<SkillTreeData>>('/skill-trees/');
    return data.results ?? [];
  },
  async getSkillTree(id: string): Promise<SkillTreeData> {
    const { data } = await apiClient.get<SkillTreeData>(`/skill-trees/${id}/`);
    return data;
  },
  async generateSkillTree(): Promise<SkillTreeData> {
    const { data } = await apiClient.post<SkillTreeData>('/skill-trees/generate/');
    return data;
  },
  async unlockNextNode(treeId: string, nodeId: string): Promise<SkillTreeNode> {
    const { data } = await apiClient.post<SkillTreeNode>(`/skill-trees/${treeId}/unlock_next/`, { node_id: nodeId });
    return data;
  },
};
