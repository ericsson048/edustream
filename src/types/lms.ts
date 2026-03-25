export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  category_id?: string | null;
  category_slug?: string;
  language?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  thumbnail_url: string;
  thumbnail?: string;
  thumbnail_file?: string | null;
  learning_objectives?: string[];
  prerequisites?: string[];
  target_audience?: string[];
  estimated_hours?: number;
  price: string;
  instructor: string;
  instructor_name?: string;
  is_published: boolean;
  modules?: CourseModule[];
}

export interface CourseModule {
  id: string;
  course: string;
  title: string;
  description?: string;
  learning_objectives?: string[];
  estimated_minutes?: number;
  is_published?: boolean;
  order: number;
  lessons?: CourseLesson[];
}

export interface CourseLesson {
  id: string;
  module: string;
  title: string;
  content: string;
  lesson_type?: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'LIVE' | 'DOWNLOAD';
  status?: 'DRAFT' | 'PUBLISHED';
  video_url: string;
  video?: string;
  video_file?: string | null;
  transcript?: string;
  instructor_notes?: string;
  duration_seconds: number;
  order: number;
  is_preview: boolean;
  resources?: LessonResource[];
}

export interface LessonResource {
  id: string;
  lesson: string;
  title: string;
  kind: 'PDF' | 'LINK' | 'ZIP' | 'OTHER';
  description: string;
  file_url: string;
  file?: string | null;
  file_download_url?: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student: string;
  course: string;
  course_title: string;
  is_active: boolean;
  purchased_at: string;
}
