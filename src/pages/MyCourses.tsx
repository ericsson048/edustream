import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import type { Course, Enrollment } from '../types/lms';
import { useToast } from '../contexts/ToastContext';

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [coursesMap, setCoursesMap] = useState<Record<string, Course>>({});
  const { showToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [myEnrollments, allCourses] = await Promise.all([
          courseService.listEnrollments(),
          courseService.listCourses(),
        ]);
        setEnrollments(myEnrollments);
        setCoursesMap(Object.fromEntries(allCourses.map((course) => [course.id, course])));
      } catch {
        const message = 'Impossible de charger vos cours.';
        showToast(message, 'error');
      }
    }
    load();
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Learning Journey</h1>
              <p className="text-slate-500 mt-1">Continue where you left off.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {enrollments.map((enrollment) => {
              const course = coursesMap[enrollment.course];
              return (
                <div key={enrollment.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden group flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={course?.thumbnail_url || 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?auto=format&fit=crop&w=1631&q=80'}
                      alt={course?.title || enrollment.course_title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {course?.title || enrollment.course_title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2">{course?.instructor_name || 'Instructor'}</p>
                    <div className="mt-auto pt-4">
                      <Link to="/player" className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        Continue Learning
                        <PlayCircle className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
