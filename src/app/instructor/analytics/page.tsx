import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { billingService } from '../../../services/billingService';
import { courseService } from '../../../services/courseService';
import { learningService, type SubmissionItem } from '../../../services/learningService';
import type { Course, Enrollment } from '../../../types/lms';

type RevenuePoint = {
  name: string;
  revenue: number;
};

function monthLabel(value: string) {
  return new Date(value).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function InstructorAnalytics() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [revenueSeries, setRevenueSeries] = useState<RevenuePoint[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      courseService.listCourses({ instructor: user.id }),
      courseService.listEnrollments(),
      learningService.listSubmissions(),
      billingService.getInstructorEarnings(),
    ])
      .then(([courseList, enrollmentList, submissionList, earnings]) => {
        setCourses(courseList);
        setEnrollments(enrollmentList);
        setSubmissions(submissionList);

        const monthlyRevenue = earnings.transactions.reduce<Record<string, number>>((acc, tx) => {
          const key = monthLabel(tx.created_at);
          acc[key] = (acc[key] || 0) + Number(tx.instructor_earning || 0);
          return acc;
        }, {});
        setRevenueSeries(
          Object.entries(monthlyRevenue).map(([name, revenue]) => ({
            name,
            revenue: Number(revenue.toFixed(2)),
          })),
        );
      })
      .catch(() => showToast('Impossible de charger les analytics instructeur.', 'error'));
  }, [showToast, user?.id]);

  const courseStats = useMemo(() => {
    const enrollmentsByCourse = enrollments.reduce<Record<string, number>>((acc, enrollment) => {
      acc[enrollment.course] = (acc[enrollment.course] || 0) + 1;
      return acc;
    }, {});
    const submissionsByCourse = submissions.reduce<Record<string, number>>((acc, submission) => {
      if (!submission.course_id) return acc;
      acc[submission.course_id] = (acc[submission.course_id] || 0) + 1;
      return acc;
    }, {});
    const gradedByCourse = submissions.reduce<Record<string, number>>((acc, submission) => {
      if (!submission.course_id || submission.status !== 'GRADED') return acc;
      acc[submission.course_id] = (acc[submission.course_id] || 0) + 1;
      return acc;
    }, {});

    return courses.map((course) => ({
      name: course.title.length > 18 ? `${course.title.slice(0, 18)}...` : course.title,
      students: enrollmentsByCourse[course.id] || 0,
      submissions: submissionsByCourse[course.id] || 0,
      graded: gradedByCourse[course.id] || 0,
    }));
  }, [courses, enrollments, submissions]);

  const topCourses = [...courseStats].sort((left, right) => right.students - left.students).slice(0, 5);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-slate-500 mt-1">Real usage data across enrollments, grading throughput and instructor revenue.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-6">Course Activity</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="students" fill="#2563eb" radius={[4, 4, 0, 0]} name="Students" />
                    <Bar dataKey="submissions" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Submissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-6">Revenue Trend</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-6">Grading Completion</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={courseStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="graded" stroke="#f59e0b" fill="#fde68a" name="Graded" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-4">Top Performing Courses</h2>
              <div className="space-y-4">
                {topCourses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    Analytics will appear as soon as your courses receive enrollments and submissions.
                  </div>
                )}
                {topCourses.map((course) => {
                  const completion = course.submissions > 0 ? Math.round((course.graded / course.submissions) * 100) : 0;
                  return (
                    <div key={course.name} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                      <div>
                        <h3 className="font-bold text-slate-900">{course.name}</h3>
                        <p className="text-sm text-slate-500">{course.students} enrolled learners</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{completion}%</p>
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Graded</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

