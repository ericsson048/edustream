import { apiClient } from './apiClient';
import type { AttendanceRecord, ContentBlock, Course, CourseCategory, CourseGradesSummary, CourseInvitation, CourseLesson, CourseModule, CourseReview, CourseTranscript, Enrollment, Evaluation, EvaluationGrade, LearningPath, LessonResource, NoteItem, PathCourseItem, ProgressItem, Tag, UniversitySession } from '../types/lms';
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

export interface CourseStudent {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  joined_at: string;
  is_active: boolean;
  completed_lessons: number;
  total_lessons: number;
  completion_percent: number;
  course?: { id: string; title: string };
}

export interface StudentDetail {
  student: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
    title: string;
    bio: string;
    location: string;
    website: string;
    date_joined: string;
    last_seen: string | null;
    email_verified: boolean;
    is_active: boolean;
  };
  stats: {
    courses_enrolled: number;
    courses_completed: number;
    avg_completion: number;
    avg_quiz: number | null;
    certificates_count: number;
    focus_minutes: number;
    streak_days: number;
    ai_messages: number;
    notes_count: number;
    transactions_count: number;
  };
  enrollments: Array<{
    enrollment_id: string;
    course: { id: string; title: string; thumbnail_url: string };
    enrolled_at: string;
    is_active: boolean;
    completed_lessons: number;
    total_lessons: number;
    completion_percent: number;
    quiz_average: number | null;
    quiz_attempts: number;
    quizzes_passed: number;
    last_activity: string | null;
    certificate: { id: string; certificate_code: string; issued_at: string } | null;
    assignments: Array<{
      assignment_id: string;
      title: string;
      points: number;
      status: string;
      grade: number | null;
      feedback: string;
      submitted_at: string;
    }>;
    lesson_progress: Array<{
      lesson_id: string;
      title: string;
      lesson_type: string;
      is_completed: boolean;
      completion: number;
      last_position_seconds: number;
      updated_at: string;
    }>;
  }>;
  recent_activity: Array<{
    kind: string;
    created_at: string;
    course_title: string;
    lesson_title: string;
  }>;
  transactions: Array<{
    id: string;
    course_title: string;
    amount_paid: number;
    status: string;
    created_at: string;
  }>;
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

  async enrollWithInvitation(courseId: string, invitationCode: string): Promise<Enrollment> {
    const { data } = await apiClient.post<Enrollment>('/enrollments/', {
      course: courseId,
      invitation_code: invitationCode,
    });
    return data;
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
    course_type?: 'REGULAR' | 'MARGINAL';
    start_date?: string | null;
    end_date?: string | null;
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
    form.append('course_type', payload.course_type || 'REGULAR');
    if (payload.start_date) form.append('start_date', payload.start_date);
    if (payload.end_date) form.append('end_date', payload.end_date);
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
        | 'course_type'
        | 'start_date'
        | 'end_date'
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
    if (payload.course_type !== undefined) form.append('course_type', payload.course_type);
    if (payload.start_date !== undefined) form.append('start_date', payload.start_date || '');
    if (payload.end_date !== undefined) form.append('end_date', payload.end_date || '');
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

  async listCourseStudents(courseId: string): Promise<CourseStudent[]> {
    const { data } = await apiClient.get<{ count: number; results: CourseStudent[] }>(`/courses/${courseId}/students/`);
    return data.results ?? [];
  },

  async listAllStudents(): Promise<CourseStudent[]> {
    const { data } = await apiClient.get<{ count: number; results: CourseStudent[] }>('/students-overview/');
    return data.results ?? [];
  },

  async getStudentDetail(studentId: string): Promise<StudentDetail> {
    const { data } = await apiClient.get<StudentDetail>(`/students/${studentId}/`);
    return data;
  },

  async removeCourseStudent(courseId: string, enrollmentId: string): Promise<void> {
    await apiClient.post(`/courses/${courseId}/students/remove/`, { enrollment_id: enrollmentId });
  },

  async listCourseInvitations(courseId: string): Promise<CourseInvitation[]> {
    const { data } = await apiClient.get<{ count: number; results: CourseInvitation[] }>(`/courses/${courseId}/invitations/`);
    return data.results ?? [];
  },

  async createCourseInvitation(courseId: string, payload: { max_uses?: number; expires_at?: string | null }): Promise<CourseInvitation> {
    const { data } = await apiClient.post<CourseInvitation>(`/courses/${courseId}/invitations/`, payload);
    return data;
  },

  async revokeCourseInvitation(courseId: string, invitationId: string): Promise<void> {
    await apiClient.post(`/courses/${courseId}/invitations/revoke/`, { invitation_id: invitationId });
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

  async getLesson(id: string): Promise<CourseLesson> {
    const { data } = await apiClient.get<CourseLesson>(`/lessons/${id}/`);
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

  async listResources(params?: { lesson?: string }): Promise<LessonResource[]> {
    const { data } = await apiClient.get<PaginatedResponse<LessonResource>>('/resources/', { params });
    return data.results ?? [];
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

  async listContentBlocks(params?: { lesson?: string }): Promise<ContentBlock[]> {
    const { data } = await apiClient.get<ContentBlock[]>('/content-blocks/', { params });
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async createContentBlock(payload: {
    lesson: string;
    kind: ContentBlock['kind'];
    data: Record<string, any>;
    order: number;
  }): Promise<ContentBlock> {
    const { data } = await apiClient.post<ContentBlock>('/content-blocks/', payload);
    return data;
  },

  async updateContentBlock(id: string, payload: Partial<Pick<ContentBlock, 'kind' | 'data' | 'order'>>): Promise<ContentBlock> {
    const { data } = await apiClient.patch<ContentBlock>(`/content-blocks/${id}/`, payload);
    return data;
  },

  async deleteContentBlock(id: string): Promise<void> {
    await apiClient.delete(`/content-blocks/${id}/`);
  },

  async listReviews(params?: { course?: string }): Promise<CourseReview[]> {
    const { data } = await apiClient.get<CourseReview[]>('/reviews/', { params });
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async createReview(payload: { course: string; rating: number; comment: string }): Promise<CourseReview> {
    const { data } = await apiClient.post<CourseReview>('/reviews/', payload);
    return data;
  },

  async listLearningPaths(params?: { is_active?: boolean }): Promise<LearningPath[]> {
    const { data } = await apiClient.get<LearningPath[]>('/learning-paths/', { params });
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async listTags(): Promise<import('../types/lms').Tag[]> {
    const { data } = await apiClient.get<import('../types/lms').Tag[]>('/tags/');
    return Array.isArray(data) ? data : (data as any).results ?? [];
  },

  async uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<{ url: string }>('/upload-image/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  },

  // --- Suivi universitaire ---

  async listUniversitySessions(courseId: string): Promise<UniversitySession[]> {
    const { data } = await apiClient.get<{ count: number; results: UniversitySession[] }>(
      '/university-sessions/',
      { params: { course: courseId } },
    );
    return data.results ?? [];
  },

  async createUniversitySession(payload: {
    course: string;
    session_type: 'CM' | 'TD' | 'TP';
    title?: string;
    date: string;
    start_time: string;
    end_time: string;
    location?: string;
  }): Promise<UniversitySession> {
    const { data } = await apiClient.post<UniversitySession>('/university-sessions/', payload);
    return data;
  },

  async deleteUniversitySession(sessionId: string): Promise<void> {
    await apiClient.delete(`/university-sessions/${sessionId}/`);
  },

  async listSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const { data } = await apiClient.get<AttendanceRecord[]>(`/university-sessions/${sessionId}/attendance/`);
    return data;
  },

  async markSessionAttendance(sessionId: string, records: { student_id: string; status: string }[]): Promise<number> {
    const { data } = await apiClient.post<{ updated: number }>(
      `/university-sessions/${sessionId}/attendance/`,
      { records },
    );
    return data.updated;
  },

  async listAttendanceRecords(params?: { session?: string; student?: string }): Promise<AttendanceRecord[]> {
    const { data } = await apiClient.get<{ count: number; results: AttendanceRecord[] }>(
      '/attendance-records/',
      { params },
    );
    return data.results ?? [];
  },

  async justifyAbsence(recordId: string, justification: string): Promise<AttendanceRecord> {
    const { data } = await apiClient.post<AttendanceRecord>(`/attendance-records/${recordId}/justify/`, {
      justification,
    });
    return data;
  },

  async reviewJustification(recordId: string, decision: 'APPROVE' | 'REJECT'): Promise<AttendanceRecord> {
    const { data } = await apiClient.post<AttendanceRecord>(`/attendance-records/${recordId}/review/`, {
      decision,
    });
    return data;
  },

  async listEvaluations(courseId: string): Promise<Evaluation[]> {
    const { data } = await apiClient.get<{ count: number; results: Evaluation[] }>('/evaluations/', {
      params: { course: courseId },
    });
    return data.results ?? [];
  },

  async createEvaluation(payload: {
    course: string;
    kind: 'CONTINUOUS' | 'EXAM' | 'ORAL';
    title: string;
    coefficient: number;
    date?: string | null;
    quiz?: string | null;
    assignment?: string | null;
  }): Promise<Evaluation> {
    const { data } = await apiClient.post<Evaluation>('/evaluations/', payload);
    return data;
  },

  async deleteEvaluation(evaluationId: string): Promise<void> {
    await apiClient.delete(`/evaluations/${evaluationId}/`);
  },

  async listEvaluationGrades(params?: { evaluation?: string; enrollment?: string; attempt?: number }): Promise<EvaluationGrade[]> {
    const { data } = await apiClient.get<{ count: number; results: EvaluationGrade[] }>('/evaluation-grades/', {
      params,
    });
    return data.results ?? [];
  },

  async upsertEvaluationGrade(payload: {
    evaluation: string;
    enrollment: string;
    attempt: number;
    note: number | null;
  }): Promise<EvaluationGrade> {
    const { data } = await apiClient.post<EvaluationGrade>('/evaluation-grades/', payload);
    return data;
  },

  async getCourseGradesSummary(courseId: string): Promise<CourseGradesSummary> {
    const { data } = await apiClient.get<CourseGradesSummary>(`/course-grades/${courseId}/`);
    return data;
  },

  async decideCourseGrade(
    courseId: string,
    payload: { enrollment_id: string; attempt: number; decision: string },
  ): Promise<{ enrollment_id: string; student_name: string; attempt: number; decision: string; average: number | null; credits_earned: number }> {
    const { data } = await apiClient.post(`/course-grades/${courseId}/decide/`, payload);
    return data;
  },

  async getCourseTranscript(courseId: string): Promise<CourseTranscript> {
    const { data } = await apiClient.get<CourseTranscript>(`/course-transcript/${courseId}/`);
    return data;
  },
};
