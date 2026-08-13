import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { BookOpen, Clock, DollarSign, Users, Video } from 'lucide-react';
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
import type { Course, Enrollment } from '../../types/lms';

function asCurrency(value?: string | number | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      courseService.listCourses({ instructor: user.id }),
      courseService.listEnrollments(),
      learningService.listSubmissions(),
      liveService.listLiveSessions(),
      billingService.getInstructorEarnings(),
    ])
      .then(([courseList, enrollmentList, submissionList, liveSessions, earningsResult]) => {
        setCourses(courseList);
        setEnrollments(enrollmentList);
        setSubmissions(submissionList);
        setLiveSessionsCount(liveSessions.filter((session) => session.status !== 'ENDED').length);
        setEarnings(earningsResult);
      })
      .catch(() => showToast('Impossible de charger le tableau de bord instructeur.', 'error'));
  }, [showToast, user?.id]);

  const courseEnrollmentMap = useMemo(() => {
    return enrollments.reduce<Record<string, number>>((acc, enrollment) => {
      acc[enrollment.course] = (acc[enrollment.course] || 0) + 1;
      return acc;
    }, {});
  }, [enrollments]);

  const pendingGrades = useMemo(
    () => submissions.filter((submission) => submission.status !== 'GRADED' || !submission.grade).length,
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
      chart: { ...base.chart, type: 'column', height: 280 },
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
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel }, formatter: function () { return `$${this.value}`; } },
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          pointPadding: 0.15,
          groupPadding: 0.1,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Earnings',
          color: '#0d9488',
          data: revenueData,
        },
      ],
    };
  }, [revenueData, theme]);

  const courseEnrollmentChartOptions = useMemo<Highcharts.Options>(() => {
    const colors = chartThemeColors(theme);
    const base = baseChartTheme(theme);
    return {
      ...base,
      chart: { ...base.chart, type: 'column', height: 280 },
      xAxis: {
        categories: courseEnrollmentData.map((item) => item.name),
        labels: {
          style: { color: colors.axisLabel },
          rotation: -25,
          overflow: 'justify',
        },
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
      },
      yAxis: {
        min: 0,
        title: { text: undefined },
        allowDecimals: false,
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel } },
      },
      plotOptions: {
        column: {
          borderRadius: 6,
          pointPadding: 0.1,
          groupPadding: 0.1,
          colorByPoint: true,
        },
      },
      series: [
        {
          type: 'column',
          name: 'Students',
          data: courseEnrollmentData,
        },
      ],
    };
  }, [courseEnrollmentData, theme]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Instructor Dashboard</h1>
            <p className="text-slate-500 mt-1">Pilot your catalog, grading queue, revenue and live sessions from one place.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
            {[
              { label: 'Total Students', value: enrollments.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
              { label: 'My Courses', value: courses.length, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-100' },
              { label: 'Published', value: publishedCourses, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
              { label: 'Pending Grades', value: pendingGrades, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
              { label: 'Revenue', value: asCurrency(earnings?.summary.total_earned), icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-100' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 xl:grid-cols-2 mb-8">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Earnings Over Time</h2>
                <span className="text-xs font-bold text-slate-500 rounded-lg py-1 px-2 bg-slate-50">{revenueData.length} month(s)</span>
              </div>
              {revenueData.length > 0 ? (
                <div className="h-[280px] w-full">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={revenueChartOptions}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  No completed transactions yet.
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Students Per Course</h2>
                <span className="text-xs font-bold text-slate-500 rounded-lg py-1 px-2 bg-slate-50">{courseEnrollmentData.length} course(s)</span>
              </div>
              {courseEnrollmentData.length > 0 ? (
                <div className="h-[280px] w-full">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={courseEnrollmentChartOptions}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                  No courses yet.
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.5fr,0.9fr]">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Top Courses</h2>
                <Link to="/instructor/courses" className="text-sm font-bold text-blue-600 hover:text-blue-700">
                  Manage catalog
                </Link>
              </div>

              <div className="space-y-4">
                {topCourses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                    No course yet. Start with the guided course creation flow.
                  </div>
                )}

                {topCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/instructor/courses/${course.id}`}
                    className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                        {course.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{course.title}</h3>
                        <p className="text-sm text-slate-500">{courseEnrollmentMap[course.id] || 0} students enrolled</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        course.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Grading Queue</h2>
                    <p className="text-sm text-slate-500">{pendingGrades} submission(s) still need review.</p>
                  </div>
                </div>
                <Link to="/instructor/assignments" className="inline-flex text-sm font-bold text-blue-600 hover:text-blue-700">
                  Open grading workspace
                </Link>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <Video className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Live Sessions</h2>
                    <p className="text-sm text-slate-500">{liveSessionsCount} upcoming or active session(s).</p>
                  </div>
                </div>
                <Link to="/instructor/schedule" className="inline-flex text-sm font-bold text-blue-600 hover:text-blue-700">
                  Manage schedule
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

