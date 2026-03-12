import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Search, Plus, MoreHorizontal } from 'lucide-react';

const courses = [
  { id: 1, title: 'Advanced React Patterns', instructor: 'Sarah Chen', category: 'Development', students: 450, status: 'Published' },
  { id: 2, title: 'Machine Learning Basics', instructor: 'Dr. Marcus Vance', category: 'Data Science', students: 320, status: 'Published' },
  { id: 3, title: 'Introduction to UX Design', instructor: 'Jason Keller', category: 'Design', students: 0, status: 'Pending Review' },
  { id: 4, title: 'Digital Marketing 101', instructor: 'Emily Davis', category: 'Marketing', students: 120, status: 'Draft' },
];

export default function AdminCourses() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Manage Courses</h1>
              <p className="text-slate-500 mt-1">Review, approve, and manage platform courses.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search courses..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Statuses</option>
                <option>Published</option>
                <option>Pending Review</option>
                <option>Draft</option>
              </select>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Course Title</th>
                  <th className="px-6 py-4">Instructor</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Students</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{course.title}</td>
                    <td className="px-6 py-4 text-slate-500">{course.instructor}</td>
                    <td className="px-6 py-4 text-slate-500">{course.category}</td>
                    <td className="px-6 py-4 text-slate-500">{course.students}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        course.status === 'Published' ? 'bg-green-100 text-green-700' : 
                        course.status === 'Pending Review' ? 'bg-amber-100 text-amber-700' : 
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
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
