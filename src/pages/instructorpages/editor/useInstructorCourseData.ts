import { useEffect, useState } from 'react';
import { courseService } from '../../../services/courseService';
import type { GeneratedCourseOutline } from '../../../services/aiService';
import { learningService, type AssignmentItem, type QuizItem } from '../../../services/learningService';
import type { Course, CourseCategory } from '../../../types/lms';
import { useToast } from '../../../contexts/ToastContext';
import { sortByOrder } from './shared';

export function useInstructorCourseData(courseId: string) {
  const { showToast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [moduleQuizzes, setModuleQuizzes] = useState<Record<string, QuizItem | null>>({});
  const [lessonQuizzes, setLessonQuizzes] = useState<Record<string, QuizItem | null>>({});
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedCourseOutline | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCourse = async (options?: { silent?: boolean }) => {
    if (!courseId) return;
    if (!options?.silent) {
      setIsLoading(true);
    }

    try {
      const [courseData, categoriesData, assignmentsData] = await Promise.all([
        courseService.getCourse(courseId),
        courseService.listCategories(),
        learningService.listAssignmentsByCourse(courseId),
      ]);

      const modules = sortByOrder(courseData.modules || []);
      const moduleQuizEntries = await Promise.all(
        modules.map(async (module) => {
          const quizzes = await learningService.listQuizzesByModule(module.id);
          return [module.id, quizzes[0] || null] as const;
        }),
      );
      const lessonQuizEntries = await Promise.all(
        modules.flatMap((module) =>
          sortByOrder(module.lessons || []).map(async (lesson) => {
            const quizzes = await learningService.listQuizzesByLesson(lesson.id);
            return [lesson.id, quizzes[0] || null] as const;
          }),
        ),
      );

      setCourse({ ...courseData, modules });
      setCategories(categoriesData);
      setAssignments(assignmentsData);
      setModuleQuizzes(Object.fromEntries(moduleQuizEntries));
      setLessonQuizzes(Object.fromEntries(lessonQuizEntries));

      const pendingOutline = sessionStorage.getItem(`pending-outline:${courseId}`);
      if (pendingOutline) {
        try {
          setGeneratedOutline(JSON.parse(pendingOutline) as GeneratedCourseOutline);
        } catch {
          sessionStorage.removeItem(`pending-outline:${courseId}`);
          setGeneratedOutline(null);
        }
      } else {
        setGeneratedOutline(null);
      }
    } catch {
      showToast('Impossible de charger ce cours instructeur.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const importGeneratedOutline = async () => {
    if (!course || !generatedOutline) return false;

    try {
      await courseService.importOutline(course.id, {
        outline: generatedOutline,
        subtitle: course.subtitle,
        category_id: course.category_id || undefined,
        language: course.language,
        target_audience: course.target_audience || [],
        estimated_hours: course.estimated_hours,
        is_published: course.is_published,
      });
      sessionStorage.removeItem(`pending-outline:${course.id}`);
      setGeneratedOutline(null);
      await refreshCourse({ silent: true });
      showToast('Structure IA importee dans le cours.', 'success');
      return true;
    } catch {
      showToast('Import du plan IA impossible.', 'error');
      return false;
    }
  };

  useEffect(() => {
    refreshCourse().catch(() => showToast('Impossible de charger ce cours instructeur.', 'error'));
  }, [courseId]);

  return {
    assignments,
    categories,
    course,
    generatedOutline,
    importGeneratedOutline,
    isLoading,
    lessonQuizzes,
    moduleQuizzes,
    refreshCourse,
    setCourse,
  };
}

