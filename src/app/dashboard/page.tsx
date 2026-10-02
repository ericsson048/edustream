import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { PlayCircle, CheckCircle, Star, ArrowRight, CalendarClock, Flame, TrendingUp, BookOpen, Zap, Sparkles, Target, Clock3, Trophy, MessageSquare, FileText, BrainCircuit, Video } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { courseService } from '../../services/courseService';
import { learningService, type AssignmentItem, type SubmissionItem, type UserStats, type RecommendedCourseItem, type UserActivityItem } from '../../services/learningService';
import { liveService, type LiveSessionItem } from '../../services/liveService';
import type { Course, Enrollment, ProgressItem } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { baseChartTheme, chartThemeColors } from '../../lib/chartTheme';
import { useTranslation } from 'react-i18next';

type CourseWithMetrics = {
  enrollment: Enrollment;
  course?: Course;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextLessonId?: string;
};

const ACTIVITY_LABELS: Record<string, string> = {
  LESSON_STARTED: 'activity_LESSON_STARTED',
  LESSON_COMPLETED: 'activity_LESSON_COMPLETED',
  QUIZ_PASSED: 'activity_QUIZ_PASSED',
  QUIZ_FAILED: 'activity_QUIZ_FAILED',
  COURSE_ENROLLED: 'activity_COURSE_ENROLLED',
  COURSE_COMPLETED: 'activity_COURSE_COMPLETED',
  CERTIFICATE_CLAIMED: 'activity_CERTIFICATE_CLAIMED',
  NOTE_CREATED: 'activity_NOTE_CREATED',
  ASSIGNMENT_SUBMITTED: 'activity_ASSIGNMENT_SUBMITTED',
  FOCUS_SESSION: 'activity_FOCUS_SESSION',
};

const ACTIVITY_ICONS: Record<string, typeof PlayCircle> = {
  LESSON_STARTED: PlayCircle,
  LESSON_COMPLETED: CheckCircle,
  QUIZ_PASSED: Trophy,
  QUIZ_FAILED: BrainCircuit,
  COURSE_ENROLLED: BookOpen,
  COURSE_COMPLETED: Target,
  CERTIFICATE_CLAIMED: Star,
  NOTE_CREATED: FileText,
  ASSIGNMENT_SUBMITTED: FileText,
  FOCUS_SESSION: Clock3,
};

// One accent (blue) + neutrals. Pie slices use tints of the same hue instead of a rainbow.
const PIE_COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#64748b', '#94a3b8', '#cbd5e1'];

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const card = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

function getWeeklyActivity(progressItems: ProgressItem[]) {
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const count = progressItems.filter((item) => {
      const updated = new Date(item.updated_at);
      return (
        updated.getFullYear() === date.getFullYear() &&
        updated.getMonth() === date.getMonth() &&
        updated.getDate() === date.getDate()
      );
    }).length;
    return {
      name: date.toLocaleDateString(undefined, { weekday: 'short' }),
      hours: Math.max(0, Number((count * 0.75).toFixed(1))),
    };
  });
}

function Thumb({ src, alt, className }: { src?: string | null; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500`}>
        <BookOpen className="h-6 w-6" aria-hidden />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className={`${className} object-cover`} />;
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
    >
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{children}</h3>
      {action}
    </div>
  );
}

const linkAction = 'text-sm font-medium text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400';
const ghostButton = 'mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSessionItem[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recommended, setRecommended] = useState<RecommendedCourseItem[]>([]);
  const [activities, setActivities] = useState<UserActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [enrollmentList, courseList, submissionList, assignmentList, sessionList, userStats, recCourses, activityList] = await Promise.all([
          courseService.listEnrollments({ is_active: true }),
          courseService.listCourses({ is_published: true }),
          learningService.listSubmissions(),
          learningService.listAssignments(),
          liveService.listLiveSessions(),
          learningService.getUserStats(),
          learningService.getRecommendedCourses(),
          learningService.listActivities(),
        ]);

        setEnrollments(enrollmentList);
        setCoursesMap(Object.fromEntries(courseList.map((course) => [course.id, course])));
        setSubmissions(submissionList);
        setAssignments(assignmentList);
        setLiveSessions(sessionList);
        setStats(userStats);
        setRecommended(recCourses);
        setActivities(activityList);

        const progressList = (
          await Promise.all(enrollmentList.map((enrollment) => courseService.listProgress({ enrollment: enrollment.id })))
        ).flat();
        setProgressItems(progressList);
      } catch {
        showToast(t('dashboard.loadError', { defaultValue: 'Impossible de charger le dashboard.' }), 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast, t]);

  const enrolledCourses = useMemo<CourseWithMetrics[]>(() => {
    return enrollments.map((enrollment) => {
      const course = coursesMap[enrollment.course];
      const lessons = (course?.modules || []).flatMap((module) => module.lessons || []);
      const enrollmentId = String(enrollment.id);
      const progressForCourse = progressItems.filter((item) => String(item.enrollment) === enrollmentId);
      const completedLessons = progressForCourse.filter((item) => item.is_completed).length;
      const totalLessons = lessons.length;
      const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
      const firstUnfinished = lessons.find((lesson) => !progressForCourse.some((item) => String(item.lesson) === String(lesson.id) && item.is_completed));
      return {
        enrollment, course, progressPercent, completedLessons, totalLessons,
        nextLessonId: firstUnfinished?.id || lessons[0]?.id,
      };
    });
  }, [coursesMap, enrollments, progressItems]);

  const coursesInProgress = enrolledCourses.filter((item) => item.progressPercent > 0 && item.progressPercent < 100).length;
  const completedCourses = enrolledCourses.filter((item) => item.totalLessons > 0 && item.progressPercent >= 100).length;
  const gradedSubmissions = submissions.filter((item) => item.grade != null && item.is_published);
  const averageScore = gradedSubmissions.length
    ? Math.round(gradedSubmissions.reduce((sum, item) => sum + Number(item.grade), 0) / gradedSubmissions.length)
    : 0;
  const upcomingAssignments = [...assignments]
    .filter((item) => new Date(item.due_date).getTime() >= Date.now())
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 3);
  const upcomingLiveSessions = [...liveSessions]
    .filter((item) => item.status !== 'ENDED')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    .slice(0, 3);
  const totalCompletedLessons = progressItems.filter((item) => item.is_completed).length;
  const totalTrackedLessons = enrolledCourses.reduce((sum, item) => sum + item.totalLessons, 0);
  const goalPercent = totalTrackedLessons ? Math.round((totalCompletedLessons / totalTrackedLessons) * 100) : 0;
  const activityData = useMemo(() => getWeeklyActivity(progressItems), [progressItems]);
  const maxBarHours = Math.max(...activityData.map((item) => item.hours), 0);

  // The course to resume first: most advanced one that isn't finished, else the first one.
  const [featured, ...otherCourses] = useMemo(() => {
    const unfinished = enrolledCourses.filter((c) => c.progressPercent < 100);
    const sorted = [...unfinished].sort((a, b) => b.progressPercent - a.progressPercent);
    const rest = enrolledCourses.filter((c) => !sorted.includes(c));
    return [...sorted, ...rest].slice(0, 4);
  }, [enrolledCourses]);

  const activityChartOptions = useMemo<Highcharts.Options>(() => {
    const colors = chartThemeColors(theme);
    const base = baseChartTheme(theme);
    return {
      ...base,
      chart: { ...base.chart, type: 'column', height: 240 },
      xAxis: {
        categories: activityData.map((item) => item.name),
        crosshair: true,
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel } },
      },
      yAxis: {
        min: 0,
        title: { text: undefined },
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel } },
      },
      plotOptions: { column: { borderRadius: 4, pointPadding: 0.15, groupPadding: 0.1 } },
      series: [
        {
          type: 'column',
          name: t('dashboard.hours'),
          data: activityData.map((item) => ({
            name: item.name,
            y: item.hours,
            color: item.hours === maxBarHours && maxBarHours > 0 ? '#2563eb' : theme === 'dark' ? '#475569' : '#cbd5e1',
          })),
        },
      ],
    };
  }, [activityData, maxBarHours, t, theme]);

  const activityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach((act) => {
      counts[act.kind] = (counts[act.kind] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([kind, count]) => ({
        name: t(`dashboard.${ACTIVITY_LABELS[kind] || kind}`),
        y: count,
      }))
      .sort((left, right) => right.y - left.y);
  }, [activities, t]);

  const activityTypeChartOptions = useMemo<Highcharts.Options>(() => {
    const base = baseChartTheme(theme);
    return {
      ...base,
      chart: { ...base.chart, type: 'pie', height: 240 },
      colors: PIE_COLORS,
      tooltip: { ...base.tooltip, pointFormat: '{point.y} ({point.percentage:.1f}%)' },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          innerSize: '62%',
          borderWidth: 0,
          dataLabels: { enabled: false },
          showInLegend: true,
        },
      },
      series: [{ type: 'pie', name: t('dashboard.activities'), data: activityDistribution }],
    };
  }, [activityDistribution, t, theme]);

  // One strip instead of 4 gradient cards + 3 white cards: same data, one hierarchy.
  const metrics = [
    { label: t('dashboard.streak'), value: stats?.streak_days ?? '–', hint: t('dashboard.daysInARow'), icon: Flame, accent: 'text-orange-500' },
    { label: t('dashboard.today'), value: stats?.lessons_completed_today ?? '–', hint: t('dashboard.lessonsCompleted'), icon: TrendingUp, accent: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.focus'), value: stats?.total_focus_minutes ?? '–', hint: t('dashboard.totalMinutes'), icon: Zap, accent: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.coursesInProgress'), value: stats ? stats.courses_in_progress : coursesInProgress, hint: `${enrolledCourses.length} ${t('dashboard.enrolled')}`, icon: PlayCircle, accent: 'text-blue-600 dark:text-blue-400' },
    { label: t('dashboard.completedCourses'), value: stats ? stats.courses_completed : completedCourses, hint: `${stats?.lessons_completed ?? totalCompletedLessons} ${t('dashboard.lessons')}`, icon: CheckCircle, accent: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('dashboard.averageScore'), value: stats ? `${stats.average_quiz_score.toFixed(1)}%` : gradedSubmissions.length ? `${averageScore}%` : 'N/A', hint: `${stats?.skills_earned.length ?? 0} ${t('dashboard.skills')}`, icon: Star, accent: 'text-amber-600 dark:text-amber-400' },
  ];

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <main className="ml-64 flex-1">
        <Header />
        <div className="mx-auto max-w-7xl p-8">{children}</div>
      </main>
    </div>
  );

  if (loading) {
    return shell(
      <div aria-busy="true" aria-live="polite">
        <div className="mb-8 space-y-2">
          <div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mb-8 h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="space-y-4">
            <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  const lessonLink = (c: CourseWithMetrics) =>
    c.course && c.nextLessonId ? `/player/${c.course.id}/${c.nextLessonId}` : '/courses';

  return shell(
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t('dashboard.welcome', { name: user?.full_name?.split(' ')[0] || 'Student' })}
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{t('dashboard.subtitle')}</p>
      </header>

      {/* Metrics strip */}
      <section aria-label={t('dashboard.studyActivity')} className={`${card} mb-8 grid grid-cols-2 divide-slate-200 dark:divide-slate-800 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x`}>
        {metrics.map((m) => (
          <div key={m.label} className="p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <m.icon className={`h-4 w-4 ${m.accent}`} aria-hidden />
              <span className="truncate">{m.label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{m.value}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{m.hint}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Continue learning */}
          <section>
            <SectionTitle action={<Link to="/courses" className={linkAction}>{t('dashboard.viewAll')}</Link>}>
              {t('dashboard.continueLearning')}
            </SectionTitle>

            {!featured ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                {t('dashboard.noEnrollments')}
              </div>
            ) : (
              <div className="space-y-3">
                <div className={`${card} flex flex-col overflow-hidden sm:flex-row`}>
                  <Thumb
                    src={featured.course?.thumbnail || featured.course?.thumbnail_url}
                    alt=""
                    className="h-44 w-full sm:h-auto sm:w-56"
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{featured.course?.category || 'Course'}</p>
                    <h4 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                      {featured.course?.title || featured.enrollment.course_title}
                    </h4>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {t('dashboard.lessonProgress', { completed: featured.completedLessons, total: featured.totalLessons || 0 })}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <ProgressBar value={featured.progressPercent} label={featured.course?.title || ''} />
                      <span className="text-sm font-medium tabular-nums text-slate-700 dark:text-slate-300">{featured.progressPercent}%</span>
                    </div>
                    <Link
                      to={lessonLink(featured)}
                      className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      <PlayCircle className="h-4 w-4" aria-hidden />
                      {t('dashboard.continueLesson')}
                    </Link>
                  </div>
                </div>

                {otherCourses.length > 0 && (
                  <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
                    {otherCourses.map((item) => (
                      <li key={item.enrollment.id}>
                        <Link
                          to={lessonLink(item)}
                          className="flex items-center gap-4 p-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800/50"
                        >
                          <Thumb
                            src={item.course?.thumbnail || item.course?.thumbnail_url}
                            alt=""
                            className="h-12 w-16 shrink-0 rounded-lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                              {item.course?.title || item.enrollment.course_title}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <ProgressBar value={item.progressPercent} label={item.course?.title || ''} />
                              <span className="w-9 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{item.progressPercent}%</span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Study activity */}
          <section className={`${card} p-5`}>
            <SectionTitle action={<span className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.last7Days')}</span>}>
              {t('dashboard.studyActivity')}
            </SectionTitle>
            <div className="w-full">
              <HighchartsReact highcharts={Highcharts} options={activityChartOptions} />
            </div>
          </section>

          {/* Recommended */}
          {recommended.length > 0 && (
            <section>
              <SectionTitle action={<Link to="/courses" className={linkAction}>{t('dashboard.browseAll')}</Link>}>
                {t('dashboard.recommendedForYou')}
              </SectionTitle>
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {recommended.map((course) => (
                  <li key={course.id}>
                    <Link
                      to={`/courses/${course.slug}`}
                      className={`${card} flex h-full gap-4 p-3 transition-colors hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:border-blue-700`}
                    >
                      <Thumb src={course.thumbnail_url} alt="" className="h-20 w-24 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{course.category_name || course.level}</p>
                        <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{course.title}</h4>
                        {course.reason && <p className="mt-1 line-clamp-2 text-xs text-blue-700 dark:text-blue-400">{course.reason}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Star className="h-3 w-3" aria-hidden />{course.average_rating.toFixed(1)}</span>
                          <span>{course.enrolled_count} {t('dashboard.enrolled')}</span>
                          {course.estimated_hours && <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" aria-hidden />{course.estimated_hours}h</span>}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recent activity */}
          {activities.length > 0 && (
            <section className={`${card} p-5`}>
              <SectionTitle>{t('dashboard.recentActivity')}</SectionTitle>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {activities.slice(0, 10).map((act) => {
                  const Icon = ACTIVITY_ICONS[act.kind] || MessageSquare;
                  return (
                    <li key={act.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden />
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">
                        {t(`dashboard.${ACTIVITY_LABELS[act.kind] || act.kind}`)}
                      </p>
                      <time dateTime={act.created_at} className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(act.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </time>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar column */}
        <div className="space-y-8">
          <section className={`${card} p-5`}>
            <SectionTitle>{t('dashboard.learningGoal')}</SectionTitle>
            <div className="flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${goalPercent}% ${t('dashboard.complete')}`}>
                  <circle cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" className="stroke-slate-100 dark:stroke-slate-800" />
                  <circle
                    cx="60" cy="60" r={RING_RADIUS} fill="none" strokeWidth="10" strokeLinecap="round"
                    className="stroke-blue-600"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * (1 - goalPercent / 100)}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {goalPercent}%
                </span>
              </div>
              <dl className="flex-1 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden />{t('dashboard.completed')}
                  </dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{totalCompletedLessons}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />{t('dashboard.remaining')}
                  </dt>
                  <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{Math.max(0, totalTrackedLessons - totalCompletedLessons)}</dd>
                </div>
              </dl>
            </div>
          </section>

          {activityDistribution.length > 0 && (
            <section className={`${card} p-5`}>
              <SectionTitle action={<span className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.byType')}</span>}>
                {t('dashboard.activityBreakdown')}
              </SectionTitle>
              <HighchartsReact highcharts={Highcharts} options={activityTypeChartOptions} />
            </section>
          )}

          <section className={`${card} p-5`}>
            <SectionTitle action={<CalendarClock className="h-5 w-5 text-slate-400" aria-hidden />}>
              {t('dashboard.upcomingDeadlines')}
            </SectionTitle>
            {upcomingAssignments.length > 0 ? (
              <ul className="space-y-4">
                {upcomingAssignments.map((task) => {
                  const date = new Date(task.due_date);
                  return (
                    <li key={task.id} className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <span className="text-xs">{date.toLocaleString(undefined, { month: 'short' })}</span>
                        <span className="text-base font-semibold leading-none">{date.getDate()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{task.title}</p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{task.course_title || 'Course'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.noDeadlines')}</p>
            )}
            <Link to="/assignments" className={ghostButton}>
              {t('dashboard.viewAssignments')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>

          <section className={`${card} p-5`}>
            <SectionTitle action={<Video className="h-5 w-5 text-slate-400" aria-hidden />}>
              {t('dashboard.upcomingLiveSessions')}
            </SectionTitle>
            {upcomingLiveSessions.length > 0 ? (
              <ul className="space-y-3">
                {upcomingLiveSessions.map((session) => (
                  <li key={session.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{session.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {session.course_title || 'Course'} · {new Date(session.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('dashboard.noLiveSessions')}</p>
            )}
            <Link to="/schedule" className={ghostButton}>
              {t('dashboard.viewFullSchedule')} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}