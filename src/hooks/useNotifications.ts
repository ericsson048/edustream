import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService, type Notification } from '../services/notificationService';

export function useNotifications() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.unreadCount();
      setUnreadCount(count);
    } catch {
      // silent
    }
  }, []);

  const fetchRecent = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.list({ page: 1 });
      setRecentNotifications(data.results ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchUnreadCount(), fetchRecent()]);
  }, [fetchUnreadCount, fetchRecent]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(fetchUnreadCount, 30_000);
    const onFocus = () => fetchUnreadCount();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, fetchUnreadCount]);

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id);
    setRecentNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setRecentNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  return { unreadCount, recentNotifications, loading, refresh, markRead, markAllRead };
}
