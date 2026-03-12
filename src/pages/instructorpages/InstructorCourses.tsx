import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { Plus, Edit, Users, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

const courses = [
  { id: 1, title: 'React Patterns & Best Practices', students: 450, rating: 4.8, status: 'Published', revenue: '$12,400' },
  { id: 2, title: 'Advanced JavaScript Concepts', students: 320, rating: 4.9, status: 'Published', revenue: '$8,900' },
  { id: 3, title: 'Building Scalable APIs with Node.js', students: 0, rating: 0, status: 'Draft', revenue: '$0' },
];

export default function InstructorCourses() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Courses</h1>
              <p className="text-slate-500 mt-1">Manage your course content and curriculum.</p>
            </div>
            <Link to="/instructor/courses/edit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />
              Create New Course
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="h-32 bg-slate-100 relative">
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      course.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-slate-900 mb-4">{course.title}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Students</p>
                      <p className="text-lg font-bold text-slate-900 flex items-center gap-1">
                        <Users className="w-4 h-4 text-blue-600" /> {course.students}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Revenue</p>
                      <p className="text-lg font-bold text-slate-900">{course.revenue}</p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                    <Link to="/instructor/courses/edit" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">
                      <Edit className="w-4 h-4" /> Edit
                    </Link>
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">
                      <Eye className="w-4 h-4" /> Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
