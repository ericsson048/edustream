import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Users, BookOpen, DollarSign, Activity } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Platform overview and key metrics.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Users', value: '12,450', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
              { label: 'Active Courses', value: '842', icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
              { label: 'Revenue', value: '$45,200', icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-100' },
              { label: 'Active Sessions', value: '1,204', icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
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
             <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
             <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                   <p><span className="font-bold">New User</span> registered: michael.scott@example.com</p>
                   <span className="text-slate-400 ml-auto">2 mins ago</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                   <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                   <p><span className="font-bold">Course Published</span>: Advanced Data Structures by Dr. Vance</p>
                   <span className="text-slate-400 ml-auto">1 hour ago</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                   <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                   <p><span className="font-bold">System Alert</span>: High server load detected on node-03</p>
                   <span className="text-slate-400 ml-auto">3 hours ago</span>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
