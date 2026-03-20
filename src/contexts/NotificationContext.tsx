import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  markAllRead,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '@/api/notifications';
import { AppNotification, NotificationPreferences } from '@/types';
import { useAuth } from './AuthContext';

const POLL_INTERVAL_MS = 30_000;

const DEFAULT_PREFS: NotificationPreferences = {
  scanConfirmed: true,
  usageDepleted: true,
  expiryWarning: true,
  expired: true,
  renewalPrompt: true,
};

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  markRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  savePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [notifs, prefs] = await Promise.all([
        fetchNotifications(),
        getNotificationPreferences(),
      ]);
      setNotifications(notifs);
      setPreferences(prefs);
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [isAuthenticated]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await load();
    setIsLoading(false);
  }, [load]);

  // Initial load + polling
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }
    refresh();
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, isRead: false } : n))
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markAllRead();
    } catch {
      await load();
    }
  }, [load]);

  const savePreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...prefs };
    setPreferences(updated);
    try {
      const saved = await updateNotificationPreferences(prefs);
      setPreferences(saved);
    } catch {
      setPreferences(preferences);
    }
  }, [preferences]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, preferences, isLoading, markRead, markAllAsRead, savePreferences, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
