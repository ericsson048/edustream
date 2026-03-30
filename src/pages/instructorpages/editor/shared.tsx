import type { ReactNode } from 'react';
import { BookOpen, ChevronRight, Layers3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '../../../components/Header';
import InstructorSidebar from '../../../components/InstructorSidebar';
import type { Course, CourseLesson, CourseModule } from '../../../types/lms';

export function parseLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((left, right) => left.order - right.order);
}

type ShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function InstructorEditorShell({ title, description, eyebrow = 'Instructor Studio', actions, children }: ShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <InstructorSidebar />
      <main className="ml-64 flex-1">
        <Header />
        <div className="mx-auto max-w-7xl px-8 py-8">
          <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700 dark:text-teal-300">{eyebrow}</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              </div>
              {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
            </div>
          </section>
          <div className="mt-8 space-y-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

type BreadcrumbProps = {
  course: Course;
  module?: CourseModule | null;
  lesson?: CourseLesson | null;
};

export function EditorBreadcrumbs({ course, module, lesson }: BreadcrumbProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Link to="/instructor/courses" className="font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300">
        Mes cours
      </Link>
      <ChevronRight className="h-4 w-4" />
      <Link
        to={`/instructor/courses/edit/${course.id}`}
        className="font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
      >
        {course.title}
      </Link>
      {module ? (
        <>
          <ChevronRight className="h-4 w-4" />
          <Link
            to={`/instructor/courses/edit/${course.id}/module/${module.id}`}
            className="font-semibold text-slate-600 hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300"
          >
            {module.title}
          </Link>
        </>
      ) : null}
      {lesson ? (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">{lesson.title}</span>
        </>
      ) : null}
    </div>
  );
}

type NavProps = {
  activeSection: 'course' | 'modules' | 'module' | 'lesson';
  courseId: string;
  module?: CourseModule | null;
  lesson?: CourseLesson | null;
};

export function EditorNav({ activeSection, courseId, module, lesson }: NavProps) {
  const inCourseOverview = activeSection === 'course';
  const inModulesList = activeSection === 'modules';
  const inModulePage = activeSection === 'module';

  const links = [
    {
      href: `/instructor/courses/edit/${courseId}`,
      label: 'Cours',
      icon: BookOpen,
      active: inCourseOverview,
    },
    {
      href: `/instructor/courses/edit/${courseId}/module`,
      label: 'Modules',
      icon: Layers3,
      active: inModulesList,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {links.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              item.active
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-500/40 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
      {module ? (
        <Link
          to={`/instructor/courses/edit/${courseId}/module/${module.id}`}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
            inModulePage
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
              : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-teal-500/40 dark:hover:bg-slate-800'
          }`}
        >
          <Layers3 className="h-4 w-4" />
          {module.title}
        </Link>
      ) : null}
      {lesson ? (
        <Link
          to={`/instructor/courses/edit/${courseId}/module/${module?.id}/lesson/${lesson.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition dark:bg-white dark:text-slate-950"
        >
          <Sparkles className="h-4 w-4" />
          {lesson.title}
        </Link>
      ) : null}
    </div>
  );
}

type SummaryProps = {
  course: Course;
};

export function CourseSummaryBar({ course }: SummaryProps) {
  const modules = sortByOrder(course.modules || []);
  const lessons = modules.reduce((total, module) => total + (module.lessons || []).length, 0);
  const publishedLessons = modules.reduce(
    (total, module) => total + (module.lessons || []).filter((lesson) => lesson.status === 'PUBLISHED').length,
    0,
  );

  const stats = [
    { label: 'Modules', value: modules.length },
    { label: 'Lessons', value: lessons },
    { label: 'Lessons publiees', value: publishedLessons },
    { label: 'Etat', value: course.is_published ? 'Publie' : 'Brouillon' },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-4">
      {stats.map((item) => (
        <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{item.label}</p>
          <p className="mt-3 text-2xl font-black">{item.value}</p>
        </div>
      ))}
    </section>
  );
}
