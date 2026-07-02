import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { BookOpen, Clock, DollarSign, Users, Video } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { billingService } from '../../services/billingService';
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [liveSessionsCount, setLiveSessionsCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState('0');

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      courseService.listCourses({ instructor: user.id }),
      courseService.listEnrollments(),
      learningService.listSubmissions(),
      liveService.listLiveSessions(),
      billingService.getInstructorEarnings(),
    ])
      .then(([courseList, enrollmentList, submissionList, liveSessions, earnings]) => {
        setCourses(courseList);
        setEnrollments(enrollmentList);
        setSubmissions(submissionList);
        setLiveSessionsCount(liveSessions.filter((session) => session.status !== 'ENDED').length);
        setTotalEarned(earnings.summary.total_earned || '0');
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
              { label: 'Revenue', value: asCurrency(totalEarned), icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-100' },
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
                    to={`/instructor/courses/edit/${course.id}`}
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

