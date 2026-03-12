import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { useEffect, useState } from 'react';
import { courseService } from '../../services/courseService';
import type { Course } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    courseService
      .listCourses()
      .then(setCourses)
      .catch(() => showToast('Impossible de charger les cours.', 'error'));
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Manage Courses</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-semibold">{course.title}</td>
                    <td className="px-6 py-4">{course.instructor_name || '-'}</td>
                    <td className="px-6 py-4">{course.category}</td>
                    <td className="px-6 py-4">${course.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
