import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const engagementData = [
  { name: 'Mon', views: 400, completions: 240 },
  { name: 'Tue', views: 300, completions: 139 },
  { name: 'Wed', views: 200, completions: 980 },
  { name: 'Thu', views: 278, completions: 390 },
  { name: 'Fri', views: 189, completions: 480 },
  { name: 'Sat', views: 239, completions: 380 },
  { name: 'Sun', views: 349, completions: 430 },
];

export default function InstructorAnalytics() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics</h1>
            <p className="text-slate-500 mt-1">Track student engagement and course performance.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Engagement Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-6">Weekly Engagement</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="views" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Video Views" />
                    <Bar dataKey="completions" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Lesson Completions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-6">Revenue Trend</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} name="Revenue ($)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Performing Courses */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold mb-4">Top Performing Courses</h2>
            <div className="space-y-4">
              {[
                { name: 'React Patterns & Best Practices', score: 98, students: 450 },
                { name: 'Advanced JavaScript Concepts', score: 92, students: 320 },
              ].map((course, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                  <div>
                    <h3 className="font-bold text-slate-900">{course.name}</h3>
                    <p className="text-sm text-slate-500">{course.students} Active Students</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{course.score}%</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Completion Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
