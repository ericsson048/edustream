import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { notificationService, type Notification, type NotificationType } from '../../services/notificationService';

const typeConfig: Record<NotificationType, { icon: string; color: string; bg: string }> = {
  COURSE_UPDATE: { icon: '📚', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  ASSIGNMENT: { icon: '📝', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  GRADE: { icon: '📊', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  MESSAGE: { icon: '💬', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  SKILL_UNLOCK: { icon: '⭐', color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  SYSTEM: { icon: '🔔', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page };
      if (typeFilter) params.notification_type = typeFilter;
      const data = await notificationService.list(params as any);
      setNotifications(data.results ?? []);
      setTotalPages(Math.max(1, Math.ceil((data.count || 0) / PAGE_SIZE)));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleMarkRead = async (n: Notification) => {
    if (n.is_read) return;
    await notificationService.markRead(n.id);
    setNotifications(prev => prev.map(x => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('notifications.pageTitle')}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t('notifications.pageSubtitle')}</p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => { setTypeFilter(''); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !typeFilter ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t('notifications.allTypes')}
            </button>
            {(Object.keys(typeConfig) as NotificationType[]).map(type => (
              <button
                key={type}
                onClick={() => { setTypeFilter(type); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  typeFilter === type ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {typeConfig[type].icon} {t(`notifications.types.${type}`)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg">{t('notifications.empty')}</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {notifications.map((n) => {
                  const cfg = typeConfig[n.notification_type] || typeConfig.SYSTEM;
                  return (
                    <div
                      key={n.id}
                      onClick={() => {
                        handleMarkRead(n);
                        if (n.link) window.location.href = n.link;
                      }}
                      className={`flex gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                        n.is_read
                          ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          : 'bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center text-lg shrink-0`}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
                        <p className="text-xs text-slate-400 mt-1.5">
                          {new Date(n.created_at).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-slate-500">
                    {t('notifications.page')} {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
