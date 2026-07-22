import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { Users, BookOpen, Star, Clock } from 'lucide-react';

export default function InstructorDashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Instructor Dashboard</h1>
            <p className="text-slate-500 mt-1">Welcome back! Here's an overview of your classes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Students', value: '1,240', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
              { label: 'Active Courses', value: '4', icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-100' },
              { label: 'Average Rating', value: '4.8', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100' },
              { label: 'Pending Grades', value: '28', icon: Clock, color: 'text-rose-600', bg: 'bg-rose-100' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
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
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
             <h2 className="text-lg font-bold mb-4">Your Active Courses</h2>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">RP</div>
                      <div>
                         <h3 className="font-bold text-slate-900">React Patterns & Best Practices</h3>
                         <p className="text-sm text-slate-500">450 Students Enrolled</p>
                      </div>
                   </div>
                   <button className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100">Manage Course</button>
                </div>
                <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-bold">JS</div>
                      <div>
                         <h3 className="font-bold text-slate-900">Advanced JavaScript Concepts</h3>
                         <p className="text-sm text-slate-500">320 Students Enrolled</p>
                      </div>
                   </div>
                   <button className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100">Manage Course</button>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
