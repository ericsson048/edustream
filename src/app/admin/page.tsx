import { useEffect, useState, type FormEvent } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Users, GraduationCap, BookOpen, DollarSign, Briefcase, Megaphone, X } from 'lucide-react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { adminService, type DashboardStats, type RevenueReport } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { baseChartTheme, chartThemeColors } from '../../lib/chartTheme';
import { LoadingState, EmptyState } from '../../components/states';

const card = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

// One accent (blue) + neutrals, so the charts read as one system.
const PIE_COLORS = ['#2563eb', '#93c5fd', '#94a3b8'];

const ROLE_LABELS: Record<string, string> = {
  '': 'all users',
  STUDENT: 'students',
  INSTRUCTOR: 'instructors',
};

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
      .catch(() => showToast('Unable to load the dashboard. Refresh the page to try again.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  // Close the dialog with Escape (but not while a send is in flight).
  useEffect(() => {
    if (!showAnnounce) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) setShowAnnounce(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAnnounce, sending]);

  const handleSendAnnouncement = async (e: FormEvent) => {
    e.preventDefault();
    if (!announceForm.title.trim() || !announceForm.body.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }
    setSending(true);
    try {
      await adminService.broadcastNotification({
        title: announceForm.title,
        body: announceForm.body,
        target_role: announceForm.target_role || undefined,
      });
      showToast(`Announcement sent to ${ROLE_LABELS[announceForm.target_role] ?? 'selected users'}.`, 'success');
      setShowAnnounce(false);
      setAnnounceForm({ title: '', body: '', target_role: '' });
    } catch {
      showToast('Announcement not sent. Check your connection and try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const metrics = [
    { label: 'Users', value: stats?.total_users, icon: Users },
    { label: 'Students', value: stats?.total_students, icon: GraduationCap },
    { label: 'Instructors', value: stats?.total_instructors, icon: Briefcase },
    { label: 'Active courses', value: stats?.active_courses, icon: BookOpen },
    { label: 'Revenue', value: stats ? `$${stats.total_revenue.toLocaleString()}` : undefined, icon: DollarSign },
  ];

  const monthly = revenueReport?.monthly || [];

  const revenueChartOptions: Highcharts.Options = (() => {
    const colors = chartThemeColors(theme);
    const base = baseChartTheme(theme);
    return {
      ...base,
      chart: { ...base.chart, type: 'column', height: 260 },
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
        gridLineColor: colors.gridLine,
        labels: { style: { color: colors.axisLabel }, format: '${value}' },
      },
      tooltip: { ...base.tooltip, shared: true, valuePrefix: '$' },
      plotOptions: { column: { borderRadius: 4, pointPadding: 0.15, groupPadding: 0.1 } },
      series: [
        { type: 'column', name: 'Revenue', color: '#2563eb', data: monthly.map((point) => point.revenue) },
        { type: 'column', name: 'Payouts', color: theme === 'dark' ? '#64748b' : '#94a3b8', data: monthly.map((point) => point.payouts) },
      ],
    };
  })();

  const userBreakdownOptions: Highcharts.Options = (() => {
    const base = baseChartTheme(theme);
    const admins = stats ? Math.max(0, stats.total_users - stats.total_students - stats.total_instructors) : 0;
    const data = stats
      ? [
          { name: 'Students', y: stats.total_students },
          { name: 'Instructors', y: stats.total_instructors },
          { name: 'Admins', y: admins },
        ].filter((item) => item.y > 0)
      : [];
    return {
      ...base,
      chart: { ...base.chart, type: 'pie', height: 260 },
      colors: PIE_COLORS,
      tooltip: { ...base.tooltip, pointFormat: '{point.y} ({point.percentage:.1f}%)' },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          innerSize: '62%',
          borderWidth: 0,
          dataLabels: { enabled: false },
          showInLegend: true,
        },
      },
      series: [{ type: 'pie', name: 'Users', data }],
    };
  })();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AdminSidebar />
      <main className="ml-64 flex-1">
        <Header />
        <div className="mx-auto max-w-7xl p-8">
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin dashboard</h1>
              <p className="mt-1 text-slate-500 dark:text-slate-400">Platform overview and key metrics.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAnnounce(true)}
              className={`inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 ${focusRing}`}
            >
              <Megaphone className="h-4 w-4" aria-hidden /> New announcement
            </button>
          </header>

          <section
            aria-label="Key metrics"
            aria-busy={loading}
            className={`${card} mb-8 grid grid-cols-2 divide-slate-200 dark:divide-slate-800 md:grid-cols-3 xl:grid-cols-5 xl:divide-x`}
          >
            {metrics.map((m) => (
              <div key={m.label} className="p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <m.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden />
                  {m.label}
                </div>
                {loading ? (
                  <div className="mt-2 h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                ) : (
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                    {typeof m.value === 'number' ? m.value.toLocaleString() : m.value ?? '–'}
                  </p>
                )}
              </div>
            ))}
          </section>

          <div className="mb-8 grid gap-8 xl:grid-cols-2">
            <section className={`${card} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Revenue and payouts</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {monthly.length} {monthly.length === 1 ? 'month' : 'months'}
                </span>
              </div>
              {monthly.length > 0 ? (
                <HighchartsReact highcharts={Highcharts} options={revenueChartOptions} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {loading ? 'Loading report…' : 'No revenue yet. Monthly figures appear after the first paid enrollment.'}
                </div>
              )}
            </section>

            <section className={`${card} p-5`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">User breakdown</h2>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {stats ? stats.total_users.toLocaleString() : 0} total
                </span>
              </div>
              {stats ? (
                <HighchartsReact highcharts={Highcharts} options={userBreakdownOptions} />
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  {loading ? 'Loading users…' : 'User data is unavailable.'}
                </div>
              )}
            </section>
          </div>

          <section className={`${card} p-5`}>
            <h2 className="mb-4 text-base font-semibold">Recent activity</h2>
            {loading ? (
              <LoadingState rows={2} />
            ) : stats && stats.recent_activity.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {stats.recent_activity.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 py-3 text-sm first:pt-0 last:pb-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${item.kind === 'new_user' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      aria-hidden
                    />
                    <p className="min-w-0 flex-1 text-slate-700 dark:text-slate-300">{renderDescription(item.description)}</p>
                    <time dateTime={item.timestamp} className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                      {timeAgo(item.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No recent activity." className="py-8" />
            )}
          </section>
        </div>

        {showAnnounce && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !sending) setShowAnnounce(false);
            }}
          >
            <form
              role="dialog"
              aria-modal="true"
              aria-labelledby="announce-title"
              onSubmit={handleSendAnnouncement}
              className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 id="announce-title" className="text-lg font-semibold dark:text-white">New announcement</h2>
                <button
                  type="button"
                  onClick={() => setShowAnnounce(false)}
                  aria-label="Close"
                  className={`rounded-md p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 ${focusRing}`}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="announce-recipients" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Send to
                  </label>
                  <select
                    id="announce-recipients"
                    value={announceForm.target_role}
                    onChange={(e) => setAnnounceForm({ ...announceForm, target_role: e.target.value })}
                    className={field}
                  >
                    <option value="">All users</option>
                    <option value="STUDENT">Students only</option>
                    <option value="INSTRUCTOR">Instructors only</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="announce-subject" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Title
                  </label>
                  <input
                    id="announce-subject"
                    type="text"
                    autoFocus
                    required
                    value={announceForm.title}
                    onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
                    className={field}
                  />
                </div>
                <div>
                  <label htmlFor="announce-body" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Message
                  </label>
                  <textarea
                    id="announce-body"
                    required
                    rows={4}
                    value={announceForm.body}
                    onChange={(e) => setAnnounceForm({ ...announceForm, body: e.target.value })}
                    className={`${field} resize-none`}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAnnounce(false)}
                  className={`rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${focusRing}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className={`rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 ${focusRing}`}
                >
                  {sending ? 'Sending…' : `Send to ${ROLE_LABELS[announceForm.target_role] ?? 'selected users'}`}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// Bold the known lead-in without injecting HTML (the old dangerouslySetInnerHTML
// rendered backend text as raw HTML).
function renderDescription(text: string) {
  const match = text.match(/^(New user registered|Course published)(.*)$/s);
  if (!match) return text;
  return (
    <>
      <strong className="font-semibold text-slate-900 dark:text-white">{match[1]}</strong>
      {match[2]}
    </>
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