import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { PlayCircle, CheckCircle, Star, ArrowRight, CalendarClock, Flame, TrendingUp, BookOpen, Zap, Sparkles, Target, Loader2, Clock3, Trophy, MessageSquare, FileText, BrainCircuit } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { courseService } from '../../services/courseService';
import { learningService, type AssignmentItem, type SubmissionItem, type UserStats, type RecommendedCourseItem, type UserActivityItem } from '../../services/learningService';
import { liveService, type LiveSessionItem } from '../../services/liveService';
import type { Course, Enrollment, ProgressItem } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

type CourseWithMetrics = {
  enrollment: Enrollment;
  course?: Course;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  nextLessonId?: string;
};

const ACTIVITY_LABELS: Record<string, string> = {
  LESSON_STARTED: 'Lesson started',
  LESSON_COMPLETED: 'Lesson completed',
  QUIZ_PASSED: 'Quiz passed',
  QUIZ_FAILED: 'Quiz failed',
  COURSE_ENROLLED: 'Course enrolled',
  COURSE_COMPLETED: 'Course completed',
  CERTIFICATE_CLAIMED: 'Certificate claimed',
  NOTE_CREATED: 'Note created',
  ASSIGNMENT_SUBMITTED: 'Assignment submitted',
  FOCUS_SESSION: 'Focus session completed',
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

function getWeeklyActivity(progressItems: ProgressItem[]) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
      name: dayNames[date.getDay()],
      hours: Math.max(0, Number((count * 0.75).toFixed(1))),
    };
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
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
        setActivities(activityList.slice(0, 10));

        const progressList = (
          await Promise.all(enrollmentList.map((enrollment) => courseService.listProgress({ enrollment: enrollment.id })))
        ).flat();
        setProgressItems(progressList);
      } catch {
        showToast('Impossible de charger le dashboard.', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

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
  const gradedSubmissions = submissions.filter((item) => item.grade != null);
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
  const activityData = getWeeklyActivity(progressItems);

  const statCards = [
    { label: 'Courses in Progress', value: stats ? String(stats.courses_in_progress) : String(coursesInProgress), icon: PlayCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30', badge: `${enrolledCourses.length} enrolled` },
    { label: 'Completed Courses', value: stats ? String(stats.courses_completed) : String(completedCourses), icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', badge: `${stats?.lessons_completed ?? totalCompletedLessons} lessons` },
    { label: 'Average Score', value: stats ? `${stats.average_quiz_score.toFixed(1)}%` : (gradedSubmissions.length ? `${averageScore}%` : 'N/A'), icon: Star, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', badge: `${stats?.skills_earned.length ?? 0} skills` },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-1">Welcome back, {user?.full_name?.split(' ')[0] || 'Student'}!</h2>
            <p className="text-slate-500 dark:text-slate-400">Your personalized learning dashboard.</p>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-orange-500 to-red-500 p-5 rounded-2xl text-white shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5" />
                  <span className="text-sm font-bold opacity-80">Streak</span>
                </div>
                <p className="text-3xl font-black">{stats.streak_days}</p>
                <p className="text-xs opacity-80 mt-1">days in a row</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-indigo-500 p-5 rounded-2xl text-white shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-bold opacity-80">Today</span>
                </div>
                <p className="text-3xl font-black">{stats.lessons_completed_today}</p>
                <p className="text-xs opacity-80 mt-1">lessons completed</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-5 rounded-2xl text-white shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm font-bold opacity-80">Focus</span>
                </div>
                <p className="text-3xl font-black">{stats.total_focus_minutes}</p>
                <p className="text-xs opacity-80 mt-1">total minutes</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-5 rounded-2xl text-white shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-bold opacity-80">AI</span>
                </div>
                <p className="text-3xl font-black">{stats.total_ai_tokens_used}</p>
                <p className="text-xs opacity-80 mt-1">AI interactions</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{stat.badge}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 dark:text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold dark:text-white">Continue Learning</h3>
                  <Link to="/courses" className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">View All</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrolledCourses.slice(0, 4).map((item) => (
                    <div key={item.enrollment.id} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group">
                      <div className="h-40 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                        <img
                          src={item.course?.thumbnail || item.course?.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=1740&q=80'}
                          alt={item.course?.title || item.enrollment.course_title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <span className="absolute bottom-3 left-4 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                          {item.course?.category || 'Course'}
                        </span>
                      </div>
                      <div className="p-5">
                        <h4 className="font-bold text-lg mb-1 dark:text-white">{item.course?.title || item.enrollment.course_title}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                          {item.completedLessons} / {item.totalLessons || 0} lesson(s) completed
                        </p>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${item.progressPercent}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.progressPercent}%</span>
                        </div>
                        <Link
                          to={item.course && item.nextLessonId ? `/player/${item.course.id}/${item.nextLessonId}` : '/courses'}
                          className="block w-full py-2.5 bg-slate-900 dark:bg-slate-800 text-white text-center rounded-xl text-sm font-bold hover:bg-blue-600 dark:hover:bg-blue-600 transition-colors"
                        >
                          Continue Lesson
                        </Link>
                      </div>
                    </div>
                  ))}
                  {enrolledCourses.length === 0 && (
                    <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white dark:bg-slate-900 p-8 text-sm text-slate-500">
                      You are not enrolled in any published course yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold dark:text-white">Study Activity</h3>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg py-1 px-2 bg-slate-50 dark:bg-slate-800">Last 7 days</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} barSize={40}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} dy={10} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#fff' }} />
                      <Bar dataKey="hours" radius={[6, 6, 6, 6]}>
                        {activityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.hours === Math.max(...activityData.map((item) => item.hours), 0) ? '#2563eb' : '#334155'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {recommended.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <h3 className="text-xl font-bold dark:text-white">Recommended for You</h3>
                    </div>
                    <Link to="/courses" className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:underline">Browse All</Link>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recommended.map((course) => (
                      <Link key={course.id} to={`/courses/${course.slug}`} className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 group hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                        <div className="h-36 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                          <img
                            src={course.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=1740&q=80'}
                            alt={course.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                          <span className="absolute bottom-3 left-4 px-2 py-1 bg-purple-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">
                            {course.category_name || course.level}
                          </span>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-sm dark:text-white mb-1">{course.title}</h4>
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-2">{course.reason}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3" />{course.average_rating.toFixed(1)}</span>
                            <span>{course.enrolled_count} enrolled</span>
                            {course.estimated_hours && <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" />{course.estimated_hours}h</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {activities.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold mb-6 dark:text-white">Recent Activity</h3>
                  <div className="space-y-4">
                    {activities.map((act) => {
                      const Icon = ACTIVITY_ICONS[act.kind] || MessageSquare;
                      return (
                        <div key={act.id} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{ACTIVITY_LABELS[act.kind] || act.kind}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{new Date(act.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                <h3 className="text-lg font-bold mb-6 text-left dark:text-white">Learning Goal</h3>
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="transparent" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="12" />
                    <circle
                      cx="80" cy="80" r="70" fill="transparent" stroke="#2563eb" strokeWidth="12"
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * goalPercent) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{goalPercent}%</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Complete</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Completed</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{totalCompletedLessons}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Remaining</span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">{Math.max(0, totalTrackedLessons - totalCompletedLessons)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold dark:text-white">Upcoming Deadlines</h3>
                  <CalendarClock className="text-slate-400 w-5 h-5" />
                </div>
                <div className="space-y-5">
                  {upcomingAssignments.map((task) => {
                    const date = new Date(task.due_date);
                    return (
                      <div key={task.id} className="flex gap-4 items-center">
                        <div className="flex flex-col items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-xl">
                          <span className="text-[10px] font-bold uppercase">{date.toLocaleString(undefined, { month: 'short' })}</span>
                          <span className="text-lg font-black leading-none">{date.getDate()}</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{task.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{task.course_title || 'Course'}</p>
                        </div>
                      </div>
                    );
                  })}
                  {upcomingAssignments.length === 0 && <p className="text-sm text-slate-500">No upcoming assignment deadlines.</p>}
                </div>
                <Link to="/assignments" className="w-full mt-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                  View Assignments <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold dark:text-white">Upcoming Live Sessions</h3>
                  <CalendarClock className="text-slate-400 w-5 h-5" />
                </div>
                <div className="space-y-4">
                  {upcomingLiveSessions.map((session) => (
                    <div key={session.id} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4">
                      <p className="font-bold text-slate-900 dark:text-white">{session.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{session.course_title || 'Course'} — {new Date(session.scheduled_at).toLocaleString()}</p>
                    </div>
                  ))}
                  {upcomingLiveSessions.length === 0 && <p className="text-sm text-slate-500">No live sessions scheduled yet.</p>}
                </div>
                <Link to="/schedule" className="w-full mt-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                  View Full Schedule <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}