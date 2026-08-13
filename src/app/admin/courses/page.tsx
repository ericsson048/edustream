import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { courseService } from '../../../services/courseService';
import type { Course } from '../../../types/lms';
import { useToast } from '../../../contexts/ToastContext';

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const PAGE_SIZE = 10;

  useEffect(() => {
    courseService
      .listCourses()
      .then(setCourses)
      .catch(() => showToast('Impossible de charger les cours.', 'error'));
  }, [showToast]);

  const totalPages = Math.ceil(courses.length / PAGE_SIZE) || 1;
  const paginatedCourses = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTogglePublish = async (course: Course) => {
    setTogglingId(course.id);
    try {
      const updated = await courseService.updateCourse(course.id, { is_published: !course.is_published });
      setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast(`Course ${updated.is_published ? 'published' : 'unpublished'}.`, 'success');
    } catch {
      showToast('Failed to update course.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 dark:text-white">Manage Courses</h1>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCourses.map((course) => (
                  <tr key={course.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{course.title}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{course.instructor_name || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{course.category}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">${course.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        course.is_published
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleTogglePublish(course)}
                        disabled={togglingId === course.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          course.is_published
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-800/50'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
                        }`}
                      >
                        {course.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </main>
    </div>
  );
}

