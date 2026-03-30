import { apiClient } from './apiClient';
import type { Course, CourseCategory, CourseLesson, CourseModule, Enrollment, LessonResource, NoteItem, ProgressItem } from '../types/lms';
import type { GeneratedCourseOutline } from './aiService';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CertificateItem {
  id: string;
  user: string;
  course: string;
  course_title?: string;
  instructor_name?: string;
  certificate_code: string;
  issued_at: string;
}

export const courseService = {
  async listCategories(): Promise<CourseCategory[]> {
    const { data } = await apiClient.get<PaginatedResponse<CourseCategory>>('/categories/');
    return data.results ?? [];
  },

  async listCourses(params?: { instructor?: string; is_published?: boolean }): Promise<Course[]> {
    const { data } = await apiClient.get<PaginatedResponse<Course>>('/courses/', { params });
    return data.results ?? [];
  },

  async getCourse(id: string): Promise<Course> {
    const { data } = await apiClient.get<Course>(`/courses/${id}/`);
    return data;
  },

  async listEnrollments(params?: { course?: string; is_active?: boolean }): Promise<Enrollment[]> {
    const { data } = await apiClient.get<PaginatedResponse<Enrollment>>('/enrollments/', { params });
    return data.results ?? [];
  },

  async listProgress(params?: { enrollment?: string; lesson?: string; is_completed?: boolean }): Promise<ProgressItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<ProgressItem>>('/progress/', { params });
    return data.results ?? [];
  },

  async upsertProgress(
    existingId: string | null,
    payload: {
      enrollment: string;
      lesson: string;
      completion: number;
      is_completed: boolean;
      last_position_seconds: number;
    },
  ): Promise<ProgressItem> {
    if (existingId) {
      const { data } = await apiClient.patch<ProgressItem>(`/progress/${existingId}/`, payload);
      return data;
    }
    const { data } = await apiClient.post<ProgressItem>('/progress/', payload);
    return data;
  },

  async listNotes(params?: { lesson?: string }): Promise<NoteItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<NoteItem>>('/notes/', { params });
    return data.results ?? [];
  },

  async createNote(payload: { lesson: string; content: string }): Promise<NoteItem> {
    const { data } = await apiClient.post<NoteItem>('/notes/', payload);
    return data;
  },

  async updateNote(id: string, payload: Partial<Pick<NoteItem, 'content'>>): Promise<NoteItem> {
    const { data } = await apiClient.patch<NoteItem>(`/notes/${id}/`, payload);
    return data;
  },

  async listCertificates(params?: { course?: string }): Promise<CertificateItem[]> {
    const { data } = await apiClient.get<PaginatedResponse<CertificateItem>>('/certificates/', { params });
    return data.results ?? [];
  },

  async claimCertificate(courseId: string): Promise<CertificateItem> {
    const { data } = await apiClient.post<CertificateItem>('/certificates/claim/', { course: courseId });
    return data;
  },

  async createCourse(payload: {
    title: string;
    subtitle?: string;
    description: string;
    category_id?: string;
    language?: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
    thumbnail_url?: string;
    thumbnail_file?: File;
    learning_objectives?: string[];
    prerequisites?: string[];
    target_audience?: string[];
    estimated_hours?: number;
    price: string;
    is_published?: boolean;
  }): Promise<Course> {
    const form = new FormData();
    form.append('title', payload.title);
    form.append('subtitle', payload.subtitle || '');
    form.append('description', payload.description);
    if (payload.category_id) form.append('category_id', payload.category_id);
    form.append('language', payload.language || 'en');
    form.append('level', payload.level);
    form.append('learning_objectives', JSON.stringify(payload.learning_objectives || []));
    form.append('prerequisites', JSON.stringify(payload.prerequisites || []));
    form.append('target_audience', JSON.stringify(payload.target_audience || []));
    form.append('estimated_hours', String(payload.estimated_hours ?? 0));
    form.append('price', payload.price);
    form.append('is_published', String(payload.is_published ?? false));
    if (payload.thumbnail_url) form.append('thumbnail_url', payload.thumbnail_url);
    if (payload.thumbnail_file) form.append('thumbnail_file', payload.thumbnail_file);

    const { data } = await apiClient.post<Course>('/courses/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async updateCourse(
    id: string,
    payload: Partial<
      Pick<
        Course,
        | 'title'
        | 'subtitle'
        | 'description'
        | 'language'
        | 'level'
        | 'price'
        | 'is_published'
        | 'learning_objectives'
        | 'prerequisites'
        | 'target_audience'
        | 'estimated_hours'
      >
    > & { category_id?: string | null; thumbnail_file?: File | null; thumbnail_url?: string },
  ): Promise<Course> {
    const hasFile = Object.prototype.hasOwnProperty.call(payload, 'thumbnail_file');
    if (!hasFile) {
      const { data } = await apiClient.patch<Course>(`/courses/${id}/`, payload);
      return data;
    }

    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.subtitle !== undefined) form.append('subtitle', payload.subtitle);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.category_id !== undefined && payload.category_id !== null) form.append('category_id', payload.category_id);
    if (payload.language !== undefined) form.append('language', payload.language);
    if (payload.level !== undefined) form.append('level', payload.level);
    if (payload.price !== undefined) form.append('price', String(payload.price));
    if (payload.is_published !== undefined) form.append('is_published', String(payload.is_published));
    if (payload.estimated_hours !== undefined) form.append('estimated_hours', String(payload.estimated_hours));
    if (payload.thumbnail_url !== undefined) form.append('thumbnail_url', payload.thumbnail_url);
    if (payload.learning_objectives !== undefined) form.append('learning_objectives', JSON.stringify(payload.learning_objectives));
    if (payload.prerequisites !== undefined) form.append('prerequisites', JSON.stringify(payload.prerequisites));
    if (payload.target_audience !== undefined) form.append('target_audience', JSON.stringify(payload.target_audience));
    if (payload.thumbnail_file) form.append('thumbnail_file', payload.thumbnail_file);

    const { data } = await apiClient.patch<Course>(`/courses/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async importOutline(
    id: string,
    payload: {
      outline: GeneratedCourseOutline;
      subtitle?: string;
      category_id?: string | null;
      language?: string;
      target_audience?: string[];
      estimated_hours?: number;
      is_published?: boolean;
    },
  ): Promise<Course> {
    const { data } = await apiClient.post<Course>(`/courses/${id}/import-outline/`, payload);
    return data;
  },

  async createModule(payload: {
    course: string;
    title: string;
    description?: string;
    learning_objectives?: string[];
    estimated_minutes?: number;
    is_published?: boolean;
    require_quiz_pass_to_continue?: boolean;
    order: number;
  }): Promise<CourseModule> {
    const { data } = await apiClient.post<CourseModule>('/modules/', payload);
    return data;
  },

  async updateModule(
    id: string,
    payload: Partial<
      Pick<CourseModule, 'title' | 'description' | 'learning_objectives' | 'estimated_minutes' | 'is_published' | 'require_quiz_pass_to_continue' | 'order'>
    >,
  ): Promise<CourseModule> {
    const { data } = await apiClient.patch<CourseModule>(`/modules/${id}/`, payload);
    return data;
  },

  async deleteModule(id: string): Promise<void> {
    await apiClient.delete(`/modules/${id}/`);
  },

  async createLesson(payload: {
    module: string;
    title: string;
    content: string;
    lesson_type?: CourseLesson['lesson_type'];
    status?: CourseLesson['status'];
    video_url?: string;
    video_file?: File;
    transcript?: string;
    instructor_notes?: string;
    duration_seconds?: number;
    order: number;
    is_preview?: boolean;
  }): Promise<CourseLesson> {
    const form = new FormData();
    form.append('module', payload.module);
    form.append('title', payload.title);
    form.append('content', payload.content);
    form.append('lesson_type', payload.lesson_type || 'VIDEO');
    form.append('status', payload.status || 'DRAFT');
    form.append('video_url', payload.video_url || '');
    form.append('transcript', payload.transcript || '');
    form.append('instructor_notes', payload.instructor_notes || '');
    form.append('duration_seconds', String(payload.duration_seconds ?? 0));
    form.append('order', String(payload.order));
    form.append('is_preview', String(payload.is_preview ?? false));
    if (payload.video_file) form.append('video_file', payload.video_file);

    const { data } = await apiClient.post<CourseLesson>('/lessons/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async updateLesson(
    id: string,
    payload: Partial<
      Pick<CourseLesson, 'title' | 'content' | 'lesson_type' | 'status' | 'video_url' | 'transcript' | 'instructor_notes' | 'duration_seconds' | 'order' | 'is_preview'>
    > & { video_file?: File | null },
  ): Promise<CourseLesson> {
    const hasFile = Object.prototype.hasOwnProperty.call(payload, 'video_file');
    if (!hasFile) {
      const { data } = await apiClient.patch<CourseLesson>(`/lessons/${id}/`, payload);
      return data;
    }

    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.content !== undefined) form.append('content', payload.content);
    if (payload.lesson_type !== undefined) form.append('lesson_type', payload.lesson_type);
    if (payload.status !== undefined) form.append('status', payload.status);
    if (payload.video_url !== undefined) form.append('video_url', payload.video_url);
    if (payload.transcript !== undefined) form.append('transcript', payload.transcript);
    if (payload.instructor_notes !== undefined) form.append('instructor_notes', payload.instructor_notes);
    if (payload.duration_seconds !== undefined) form.append('duration_seconds', String(payload.duration_seconds));
    if (payload.order !== undefined) form.append('order', String(payload.order));
    if (payload.is_preview !== undefined) form.append('is_preview', String(payload.is_preview));
    if (payload.video_file) form.append('video_file', payload.video_file);

    const { data } = await apiClient.patch<CourseLesson>(`/lessons/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteLesson(id: string): Promise<void> {
    await apiClient.delete(`/lessons/${id}/`);
  },

  async createResource(payload: {
    lesson: string;
    title: string;
    kind: LessonResource['kind'];
    description?: string;
    file_url?: string;
    file?: File;
  }): Promise<LessonResource> {
    const form = new FormData();
    form.append('lesson', payload.lesson);
    form.append('title', payload.title);
    form.append('kind', payload.kind);
    form.append('description', payload.description || '');
    form.append('file_url', payload.file_url || '');
    if (payload.file) form.append('file', payload.file);

    const { data } = await apiClient.post<LessonResource>('/resources/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteResource(id: string): Promise<void> {
    await apiClient.delete(`/resources/${id}/`);
  },

  async updateResource(
    id: string,
    payload: Partial<Pick<LessonResource, 'title' | 'kind' | 'description' | 'file_url'>> & { file?: File | null },
  ): Promise<LessonResource> {
    const hasFile = Object.prototype.hasOwnProperty.call(payload, 'file');
    if (!hasFile) {
      const { data } = await apiClient.patch<LessonResource>(`/resources/${id}/`, payload);
      return data;
    }

    const form = new FormData();
    if (payload.title !== undefined) form.append('title', payload.title);
    if (payload.kind !== undefined) form.append('kind', payload.kind);
    if (payload.description !== undefined) form.append('description', payload.description);
    if (payload.file_url !== undefined) form.append('file_url', payload.file_url);
    if (payload.file) form.append('file', payload.file);

    const { data } = await apiClient.patch<LessonResource>(`/resources/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};
