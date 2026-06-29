import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Users, BookOpen, DollarSign, Activity } from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { DashboardStats } from '../../services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getDashboardStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Courses', value: stats.active_courses.toLocaleString(), icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Revenue', value: `$${stats.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'text-rose-600', bg: 'bg-rose-100' },
    { label: 'Instructors', value: stats.total_instructors.toLocaleString(), icon: Activity, color: 'text-purple-600', bg: 'bg-purple-100' },
  ] : [];

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
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{loading ? '...' : stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {loading ? (
                <p className="text-slate-400 text-sm">Loading activity...</p>
              ) : stats && stats.recent_activity.length > 0 ? (
                stats.recent_activity.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      item.kind === 'new_user' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <p dangerouslySetInnerHTML={{
                      __html: item.description.replace(
                        /(New user registered|Course published)/,
                        '<span class="font-bold">$1</span>'
                      )
                    }} />
                    <span className="text-slate-400 ml-auto">{timeAgo(item.timestamp)}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm">No recent activity.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
