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
  course_type?: 'REGULAR' | 'MARGINAL';
  start_date?: string | null;
  end_date?: string | null;
  credits?: number;
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

export interface CourseInvitation {
  id: string;
  course: string;
  course_title?: string;
  code: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
  created_by_name?: string;
  created_at: string;
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
  lesson_type?: 'VIDEO' | 'TEXT' | 'QUIZ' | 'ASSIGNMENT' | 'DEVOIR' | 'LIVE' | 'DOWNLOAD';
  status?: 'DRAFT' | 'PUBLISHED';
  video_url: string;
  video?: string;
  video_file?: string | null;
  is_locked?: boolean;
  locked_reason?: string;
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
  invitation?: string | null;
  invitation_code?: string | null;
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

export interface UniversitySession {
  id: string;
  course: string;
  course_title?: string;
  title: string;
  session_type: 'CM' | 'TD' | 'TP';
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  is_cancelled: boolean;
  created_by: string;
  student_count?: number;
  created_at: string;
}

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type JustificationStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AttendanceRecord {
  id: string;
  session: string;
  student: string;
  student_name?: string;
  course_id?: string;
  course_title?: string;
  session_title?: string;
  session_date?: string;
  session_type?: string;
  status: AttendanceStatus;
  justification: string;
  justification_status: JustificationStatus;
  justification_submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  can_justify?: boolean;
  session_end?: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  course: string;
  course_title?: string;
  kind: 'CONTINUOUS' | 'EXAM' | 'ORAL';
  kind_display?: string;
  title: string;
  coefficient: string;
  date: string | null;
  assignment: string | null;
  quiz: string | null;
  source?: string | null;
  created_by: string;
  created_at: string;
}

export interface EvaluationGrade {
  id: string;
  evaluation: string;
  evaluation_title?: string;
  evaluation_kind?: string;
  enrollment: string;
  student_name?: string;
  course_id?: string;
  attempt: number;
  note: string | null;
  updated_at: string;
}

export interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  pending_justifications: number;
}

export interface StudentGradeRow {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  attendance: AttendanceSummary;
  attendance_rate: number | null;
  session_1: { average: number | null; decision: string; decision_display: string; credits_earned: number };
  session_2: { average: number | null; decision: string; decision_display: string; credits_earned: number };
  evaluations: { id: string; title: string; kind: string; coefficient: number; note: number | null }[];
}

export interface CourseGradesSummary {
  course: { id: string; title: string; credits: number };
  students: StudentGradeRow[];
}

export interface TranscriptRow {
  enrollment_id: string;
  student: { id?: string; full_name: string; email?: string };
  attendance: AttendanceSummary;
  attendance_rate: number | null;
  session_1: { average: number | null; decision: string; decision_display: string };
  session_2: { average: number | null; decision: string; decision_display: string };
  final: { attempt: number; average: number | null; decision: string; decision_display: string };
  credits_earned: number;
  evaluations: { id: string; title: string; kind: string; coefficient: number; attempt: number; note: number | null; has_grade: boolean }[];
}

export interface CourseTranscript {
  course: {
    id: string;
    title: string;
    subtitle: string;
    course_type: string;
    credits: number;
    start_date: string | null;
    end_date: string | null;
    instructor_name: string;
    issued_at: string;
  };
  rows: TranscriptRow[];
}
