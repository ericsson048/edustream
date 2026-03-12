export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  thumbnail_url: string;
  price: string;
  instructor: string;
  instructor_name?: string;
  is_published: boolean;
}

export interface Enrollment {
  id: string;
  student: string;
  course: string;
  course_title: string;
  is_active: boolean;
  purchased_at: string;
}
