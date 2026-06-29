export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  order: number;
  created_at: string;
}

export interface ContentBlock {
  id: string;
  lesson: string;
  kind: 'MARKDOWN' | 'TEXT' | 'VIDEO' | 'CODE' | 'EMBED' | 'IMAGE' | 'FILE' | 'QUIZ';
  data: Record<string, any>;
  order: number;
}

export interface CourseReview {
  id: string;
  course: string;
  user: string;
  user_full_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface LessonComment {
  id: string;
  lesson: string;
  user: string;
  user_full_name: string;
  user_avatar?: string;
  content: string;
  parent: string | null;
  replies?: LessonComment[];
  created_at: string;
}

export interface Section {
  id: string;
  course: string;
  title: string;
  description?: string;
  order: number;
  modules?: CourseModule[];
}

export interface Course {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  category: string;
  category_id?: string | null;
  category_slug?: string;
  tags?: Tag[];
  tag_ids?: string[];
  language?: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  thumbnail_url: string;
  thumbnail?: string;
  thumbnail_file?: string | null;
  learning_objectives?: string[];
  prerequisites?: string[];
  target_audience?: string[];
  estimated_hours?: number;
  hours_for_certificate?: number;
  price: string;
  instructor: string;
  instructor_name?: string;
  is_published: boolean;
  completion_criteria?: 'ALL_LESSONS' | 'ALL_QUIZZES' | 'FINAL_EXAM' | 'MANUAL';
  passing_score_percent?: number;
  certificate_template?: Record<string, any>;
  modules?: CourseModule[];
  sections?: Section[];
  reviews?: CourseReview[];
  average_rating?: number | null;
  enrollments_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CourseModule {
  id: string;
  course: string;
  section?: string | null;
  title: string;
  description?: string;
  learning_objectives?: string[];
  estimated_minutes?: number;
  is_published?: boolean;
  require_quiz_pass_to_continue?: boolean;
  prerequisite_modules?: string[];
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
  content_blocks?: ContentBlock[];
  comments?: LessonComment[];
  ai_generated?: boolean;
  ai_prompt_used?: string;
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

export interface ProgressItem {
  id: string;
  enrollment: string;
  lesson: string;
  lesson_title?: string;
  lesson_order?: number;
  module_id?: string;
  module_title?: string;
  course_id?: string;
  completion: string;
  is_completed: boolean;
  last_position_seconds: number;
  updated_at: string;
}

export interface NoteItem {
  id: string;
  user: string;
  lesson: string;
  lesson_title?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  is_active: boolean;
  courses: PathCourseItem[];
}

export interface PathCourseItem {
  id: string;
  path: string;
  course: string;
  course_title: string;
  course_thumbnail: string;
  course_level: string;
  order: number;
  is_required: boolean;
}
