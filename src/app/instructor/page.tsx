import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { BookOpen, Clock, DollarSign, Users, Video, ArrowRight, Building2, GraduationCap, CalendarDays, ClipboardList } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { baseChartTheme, chartThemeColors } from '../../lib/chartTheme';
import { billingService, type InstructorEarningsResponse } from '../../services/billingService';
import { courseService } from '../../services/courseService';
import { learningService, type SubmissionItem } from '../../services/learningService';
import { liveService } from '../../services/liveService';
import type { Course, Enrollment, UniversitySession } from '../../types/lms';

function asCurrency(value?: string | number | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

const card = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const linkAction =
  'inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-blue-400';

function Thumb({ course }: { course: Course }) {
  const [failed, setFailed] = useState(false);
  const src = course.thumbnail || course.thumbnail_url;
  if (!src || failed) {
    return (
      <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <BookOpen className="h-5 w-5" aria-hidden />
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setFailed(true)} className="h-12 w-16 shrink-0 rounded-lg object-cover" />;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {children}
    </div>
  );
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [liveSessionsCount, setLiveSessionsCount] = useState(0);
  const [earnings, setEarnings] = useState<InstructorEarningsResponse | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<UniversitySession[]>([]);
  const [pendingDeliberations, setPendingDeliberations] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      courseService.listCourses({ instructor: user.id }),
      courseService.listEnrollments(),
      learningService.listSubmissions(),
      liveService.listLiveSessions(),
      billingService.getInstructorEarnings(),
    ])
      .then(async ([courseList, enrollmentList, submissionList, liveSessions, earningsResult]) => {
        setCourses(courseList);
        setEnrollments(enrollmentList);
        setSubmissions(submissionList);
        setLiveSessionsCount(liveSessions.filter((session) => session.status !== 'ENDED').length);
        setEarnings(earningsResult);

        // Load upcoming university sessions (next 7 days) for MARGINAL courses
        const marginalCourses = courseList.filter(c => c.course_type === 'MARGINAL');
        if (marginalCourses.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const allSessions: UniversitySession[] = [];
          let totalPending = 0;
          await Promise.all(marginalCourses.map(async (c) => {
            try {
              const sessions = await courseService.listUniversitySessions(c.id);
              const upcoming = sessions.filter(s => s.date >= today).slice(0, 3);
              allSessions.push(...upcoming);
              // Count pending deliberations
              const summary = await courseService.getCourseGradesSummary(c.id).catch(() => null);
              if (summary) {
                totalPending += summary.students.filter(
                  (s: any) => s.session_1?.decision === 'PENDING'
                ).length;
              }
            } catch { /* ignore */ }
          }));
          allSessions.sort((a, b) => a.date.localeCompare(b.date));
          setUpcomingSessions(allSessions.slice(0, 5));
          setPendingDeliberations(totalPending);
        }
      })
      .catch(() => showToast('Impossible de charger le tableau de bord instructeur.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast, user?.id]);

  const courseEnrollmentMap = useMemo(() => {
    return enrollments.reduce<Record<string, number>>((acc, enrollment) => {
      acc[enrollment.course] = (acc[enrollment.course] || 0) + 1;
      return acc;
    }, {});
  }, [enrollments]);

  // A grade of 0 is a valid grade: only treat null/undefined as "not graded".
  const pendingGrades = useMemo(
    () => submissions.filter((submission) => submission.status !== 'GRADED' || submission.grade == null).length,
    [submissions],
  );

  const topCourses = useMemo(
    () =>
      [...courses]
        .sort((left, right) => (courseEnrollmentMap[right.id] || 0) - (courseEnrollmentMap[left.id] || 0))
        .slice(0, 5),
    [courseEnrollmentMap, courses],
  );

  const publishedCourses = courses.filter((course) => course.is_published).length;

  const courseEnrollmentData = useMemo(
    () =>
      [...courses]
        .map((course) => ({
          name: course.title.length > 22 ? `${course.title.slice(0, 22)}…` : course.title,
          fullName: course.title,
          y: courseEnrollmentMap[course.id] || 0,
        }))
        .sort((left, right) => right.y - left.y)
        .slice(0, 8),
    [courseEnrollmentMap, courses],
  );

  const revenueData = useMemo(() => {
    const byMonth = new Map<string, number>();
    (earnings?.transactions || []).forEach((transaction) => {
      if (transaction.status !== 'COMPLETED' && transaction.status !== 'PAID') return;
      const date = new Date(transaction.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + Number(transaction.instructor_earning || transaction.amount_paid || 0));
    });
    return Array.from(byMonth.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, total]) => {
        const [year, month] = key.split('-');
        const name = new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
        return { name, y: Math.round(total * 100) / 100 };
      });
  }, [earnings]);

  const revenueChartOptions = useMemo<Highcharts.Options>(() => {
    const colors = chartThemeColors(theme);
    const base = baseChartTheme(theme);
    return {
      ...base,
      chart: { ...base.chart, type: 'column', height: 260 },
      xAxis: {
        categories: revenueData.map((item) => item.name),
        crosshair: true,
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel } },
      },
      yAxis: {
        min: 0,
        title: { text: undefined },
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel }, format: '${value}' },
      },
      tooltip: { ...base.tooltip, valuePrefix: '$' },
      plotOptions: { column: { borderRadius: 4, pointPadding: 0.15, groupPadding: 0.1 } },
      series: [{ type: 'column', name: 'Earnings', color: '#2563eb', data: revenueData }],
    };
  }, [revenueData, theme]);

  const courseEnrollmentChartOptions = useMemo<Highcharts.Options>(() => {
    const colors = chartThemeColors(theme);
    const base = baseChartTheme(theme);
    // Horizontal bars: long course titles stay readable, no rotated labels, no rainbow.
    return {
      ...base,
      chart: { ...base.chart, type: 'bar', height: Math.max(220, courseEnrollmentData.length * 36 + 40) },
      xAxis: {
        categories: courseEnrollmentData.map((item) => item.name),
        lineColor: colors.gridLine,
        tickColor: 'transparent',
        labels: { style: { color: colors.axisLabel } },
      },
      yAxis: {
        min: 0,
        title: { text: undefined },
        allowDecimals: false,
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel } },
      },
      tooltip: { ...base.tooltip, pointFormat: '{point.fullName}: <b>{point.y}</b>' },
      legend: { enabled: false },
      plotOptions: { bar: { borderRadius: 4, pointPadding: 0.1, groupPadding: 0.1 } },
      series: [{ type: 'bar', name: 'Students', color: '#2563eb', data: courseEnrollmentData }],
    };
  }, [courseEnrollmentData, theme]);

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <InstructorSidebar />
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
          <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="mb-8 h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="mb-8 grid gap-8 xl:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-80 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    );
  }

  const metrics = [
    { label: 'Students', value: enrollments.length, icon: Users },
    { label: 'Courses', value: courses.length, icon: BookOpen, hint: `${publishedCourses} published` },
    { label: 'Pending grades', value: pendingGrades, icon: Clock, highlight: pendingGrades > 0 },
    { label: 'Live sessions', value: liveSessionsCount, icon: Video, hint: 'upcoming or active' },
    { label: 'Revenue', value: asCurrency(earnings?.summary.total_earned), icon: DollarSign },
  ];

  const marginalCourses = courses.filter(c => c.course_type === 'MARGINAL');

  return shell(
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Instructor dashboard</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Your courses, grading queue, revenue and live sessions in one place.
        </p>
        {user?.institution_name && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{user.institution_name}</span>
          </div>
        )}
      </header>

      <section className={`${card} mb-8 grid grid-cols-2 divide-slate-200 dark:divide-slate-800 md:grid-cols-3 xl:grid-cols-5 xl:divide-x`}>
        {metrics.map((m) => (
          <div key={m.label} className="p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <m.icon className={`h-4 w-4 ${m.highlight ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} aria-hidden />
              {m.label}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{m.value}</p>
            {m.hint && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.hint}</p>}
          </div>
        ))}
      </section>

      <div className="mb-8 grid gap-8 xl:grid-cols-2">
        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Earnings over time</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {revenueData.length} {revenueData.length === 1 ? 'month' : 'months'}
            </span>
          </div>
          {revenueData.length > 0 ? (
            <HighchartsReact highcharts={Highcharts} options={revenueChartOptions} />
          ) : (
            <EmptyState>No completed transactions yet. Earnings appear here after your first paid enrollment.</EmptyState>
          )}
        </section>

        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Students per course</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Top {courseEnrollmentData.length}
            </span>
          </div>
          {courseEnrollmentData.length > 0 ? (
            <HighchartsReact highcharts={Highcharts} options={courseEnrollmentChartOptions} />
          ) : (
            <EmptyState>No courses yet. Create your first course to see enrollments here.</EmptyState>
          )}
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.5fr,1fr]">
        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Top courses</h2>
            <Link to="/instructor/courses" className={linkAction}>
              Manage courses <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {topCourses.length === 0 ? (
            <EmptyState>No course yet. Start with the guided course creation flow.</EmptyState>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100 dark:divide-slate-800">
              {topCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    to={`/instructor/courses/${course.id}`}
                    className="flex items-center gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600 dark:hover:bg-slate-800/50"
                  >
                    <Thumb course={course} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{course.title}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {courseEnrollmentMap[course.id] || 0} students enrolled
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        course.is_published
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                      }`}
                    >
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          <section className={`${card} p-5`}>
            <h2 className="text-base font-semibold">Grading queue</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {pendingGrades === 0
                ? 'All submissions are graded.'
                : `${pendingGrades} ${pendingGrades === 1 ? 'submission needs' : 'submissions need'} review.`}
            </p>
            <Link to="/instructor/assignments" className={`${linkAction} mt-4`}>
              Open grading <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-base font-semibold">Live sessions</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {liveSessionsCount === 0
                ? 'No upcoming or active sessions.'
                : `${liveSessionsCount} upcoming or active ${liveSessionsCount === 1 ? 'session' : 'sessions'}.`}
            </p>
            <Link to="/instructor/schedule" className={`${linkAction} mt-4`}>
              Manage schedule <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>

          {/* Suivi universitaire widget */}
          {marginalCourses.length > 0 && (
            <section className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Suivi universitaire
                </h2>
                {pendingDeliberations > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full">
                    {pendingDeliberations} délibération{pendingDeliberations > 1 ? 's' : ''} en attente
                  </span>
                )}
              </div>

              {upcomingSessions.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune séance à venir.</p>
              ) : (
                <ul className="space-y-2">
                  {upcomingSessions.map(s => (
                    <li key={s.id} className="flex items-center gap-3 text-sm">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                        <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {s.title || `${s.session_type} — ${new Date(s.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {s.location ? ` · ${s.location}` : ''}
                        </p>
                      </div>
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold rounded">
                        {s.session_type}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 mb-2">{marginalCourses.length} cours universitaire{marginalCourses.length > 1 ? 's' : ''}</p>
                <div className="flex flex-wrap gap-2">
                  {marginalCourses.slice(0, 3).map(c => (
                    <Link key={c.id} to={`/instructor/courses/${c.id}/suivi`}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                      <ClipboardList className="w-3 h-3" />
                      {c.title.length > 20 ? c.title.slice(0, 20) + '…' : c.title}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}