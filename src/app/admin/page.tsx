import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Users, BookOpen, DollarSign, Activity, Megaphone, X } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { adminService, type DashboardStats, type RevenueReport } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { baseChartTheme, chartThemeColors } from '../../lib/chartTheme';
import { LoadingState, EmptyState } from '../../components/states';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnnounce, setShowAnnounce] = useState(false);
  const [announceForm, setAnnounceForm] = useState({ title: '', body: '', target_role: '' });
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();
  const { theme } = useTheme();

  useEffect(() => {
    Promise.all([adminService.getDashboardStats(), adminService.getRevenueReport()])
      .then(([statsResult, revenueResult]) => {
        setStats(statsResult);
        setRevenueReport(revenueResult);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSendAnnouncement = async () => {
    if (!announceForm.title.trim() || !announceForm.body.trim()) {
      showToast('Title and body are required.', 'error');
      return;
    }
    setSending(true);
    try {
      await adminService.broadcastNotification({
        title: announceForm.title,
        body: announceForm.body,
        target_role: announceForm.target_role || undefined,
      });
      showToast('Announcement sent to all users.', 'success');
      setShowAnnounce(false);
      setAnnounceForm({ title: '', body: '', target_role: '' });
    } catch {
      showToast('Failed to send announcement.', 'error');
    } finally {
      setSending(false);
    }
  };

  const statCards = stats ? [
    { label: 'Total Users', value: stats.total_users.toLocaleString(), icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Active Courses', value: stats.active_courses.toLocaleString(), icon: BookOpen, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    { label: 'Revenue', value: `$${stats.total_revenue.toLocaleString()}`, icon: DollarSign, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    { label: 'Instructors', value: stats.total_instructors.toLocaleString(), icon: Activity, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ] : [];

  const revenueChartOptions = (() => {
    const colors = chartThemeColors(theme);
    const base = baseChartTheme(theme);
    const monthly = revenueReport?.monthly || [];
    return {
      ...base,
      chart: { ...base.chart, type: 'column', height: 280 },
      xAxis: {
        categories: monthly.map((point) => point.month),
        crosshair: true,
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel } },
      },
      yAxis: {
        min: 0,
        title: { text: undefined },
        lineColor: colors.gridLine,
        tickColor: colors.gridLine,
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel }, formatter: function () { return `$${this.value}`; } },
      },
      plotOptions: {
        column: { borderRadius: 6, pointPadding: 0.15, groupPadding: 0.1 },
      },
      series: [
        { type: 'column', name: 'Revenue', color: '#0ea5e9', data: monthly.map((point) => point.revenue) },
        { type: 'column', name: 'Payouts', color: '#8b5cf6', data: monthly.map((point) => point.payouts) },
      ],
    };
  })();

  const userBreakdownOptions = (() => {
    const base = baseChartTheme(theme);
    const admins = stats ? Math.max(0, stats.total_users - stats.total_students - stats.total_instructors) : 0;
    return {
      ...base,
      chart: { ...base.chart, type: 'pie', height: 280 },
      tooltip: { ...base.tooltip, pointFormat: '{point.y} ({point.percentage:.1f}%)' },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          innerSize: '60%',
          dataLabels: { enabled: false },
          showInLegend: true,
        },
      },
      series: [
        {
          type: 'pie',
          name: 'Users',
          data: stats
            ? [
                { name: 'Students', y: stats.total_students },
                { name: 'Instructors', y: stats.total_instructors },
                { name: 'Admins', y: admins },
              ]
            : [],
        },
      ],
    };
  })();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Platform overview and key metrics.</p>
            </div>
            <button
              onClick={() => setShowAnnounce(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Megaphone className="w-4 h-4" /> Send Announcement
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {statCards.map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1 dark:text-white">{loading ? '...' : stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-8 xl:grid-cols-2 mb-8">
            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold dark:text-white">Revenue vs Payouts</h2>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg py-1 px-2 bg-slate-50 dark:bg-slate-800">
                  {revenueReport?.monthly.length ?? 0} month(s)
                </span>
              </div>
              {revenueReport && revenueReport.monthly.length > 0 ? (
                <div className="h-[280px] w-full">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={revenueChartOptions}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400">
                  No report data available.
                </div>
              )}
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold dark:text-white">User Breakdown</h2>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 rounded-lg py-1 px-2 bg-slate-50 dark:bg-slate-800">
                  {stats ? stats.total_users.toLocaleString() : 0} total
                </span>
              </div>
              {stats ? (
                <div className="h-[280px] w-full">
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={userBreakdownOptions}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-sm text-slate-500 dark:text-slate-400">
                  No data available.
                </div>
              )}
            </section>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold mb-4 dark:text-white">Recent Activity</h2>
            {loading ? (
              <LoadingState rows={2} />
            ) : stats && stats.recent_activity.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_activity.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      item.kind === 'new_user' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <p className="dark:text-slate-300" dangerouslySetInnerHTML={{
                      __html: item.description.replace(
                        /(New user registered|Course published)/,
                        '<span class="font-bold">$1</span>'
                      )
                    }} />
                    <span className="text-slate-400 dark:text-slate-500 ml-auto">{timeAgo(item.timestamp)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No recent activity." className="py-8" />
            )}
          </div>
        </div>

        {showAnnounce && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">Send Announcement</h2>
                <button onClick={() => setShowAnnounce(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Title"
                  value={announceForm.title}
                  onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Message body"
                  value={announceForm.body}
                  onChange={(e) => setAnnounceForm({ ...announceForm, body: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <select
                  value={announceForm.target_role}
                  onChange={(e) => setAnnounceForm({ ...announceForm, target_role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Users</option>
                  <option value="STUDENT">Students Only</option>
                  <option value="INSTRUCTOR">Instructors Only</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAnnounce(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendAnnouncement}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {sending ? 'Sending...' : 'Send to All'}
                </button>
              </div>
            </div>
          </div>
        )}
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

