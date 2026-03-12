import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { courseService } from '../../services/courseService';
import type { Course } from '../../types/lms';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function InstructorCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    courseService
      .listCourses()
      .then(setCourses)
      .catch(() => showToast('Impossible de charger les cours instructeur.', 'error'));
  }, [showToast]);

  const mine = useMemo(() => courses.filter((c) => c.instructor === user?.id), [courses, user?.id]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">My Courses</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mine.map((course) => (
              <article key={course.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold">{course.title}</h3>
                <p className="text-sm text-slate-500">{course.category} • ${course.price}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
