import { useState, useRef, useEffect } from 'react';
import { Bell, X, CheckCheck, ExternalLink, Settings, Ticket, Zap, Clock, RefreshCw, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationContext';
import { AppNotification, NotificationType } from '@/types';
import { cn } from '@/lib/utils';

// Maps notification type → lucide icon + colour class
const TYPE_META: Record<NotificationType, { Icon: React.ElementType; colour: string; label: string }> = {
  scan_confirmed:  { Icon: ScanLine,   colour: 'text-green-400',  label: 'Scan Confirmed'  },
  usage_depleted:  { Icon: Zap,        colour: 'text-yellow-400', label: 'Uses Depleted'   },
  expiry_warning:  { Icon: Clock,      colour: 'text-orange-400', label: 'Expiry Warning'  },
  expired:         { Icon: Ticket,     colour: 'text-red-400',    label: 'Ticket Expired'  },
  renewal_prompt:  { Icon: RefreshCw,  colour: 'text-primary',    label: 'Renewal Ready'   },
};

// Opens Gmail in the default mail client or browser — deeplink first, fallback to web
const openGmail = (userEmail: string) => {
  const gmailApp = `googlegmail://`;
  const gmailWeb = `https://mail.google.com/mail/u/${encodeURIComponent(userEmail)}/#inbox`;
  // Try app deeplink; if it doesn't open within 500ms, fall back to web
  const start = Date.now();
  window.location.href = gmailApp;
  setTimeout(() => {
    if (Date.now() - start < 600) window.open(gmailWeb, '_blank');
  }, 500);
};

const NotificationItem = ({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) => {
  const meta = TYPE_META[notification.notificationType] ?? TYPE_META.scan_confirmed;
  const { Icon, colour, label } = meta;
  const time = notification.sentAt ?? notification.createdAt;
  const relativeTime = time
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
        Math.round((new Date(time).getTime() - Date.now()) / 60000),
        'minute'
      )
    : '';

  return (
    <button
      onClick={() => !notification.isRead && onRead(notification.id)}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40',
        !notification.isRead && 'bg-primary/5'
      )}
    >
      <div className={cn('mt-0.5 shrink-0', colour)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm leading-snug">{notification.message}</p>
        {relativeTime && (
          <p className="text-xs text-muted-foreground mt-1">{relativeTime}</p>
        )}
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
};

const NotificationBell = ({ userEmail }: { userEmail: string }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, markRead, markAllAsRead, refresh } =
    useNotifications();

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) refresh();
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell trigger */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center h-10 w-10 rounded-xl transition-colors hover:bg-accent/50 active:scale-95"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border/50 bg-background/95 backdrop-blur-lg shadow-xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => { setOpen(false); navigate('/notification-preferences'); }}
                className="p-1.5 rounded-md hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Notification preferences"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem key={n.id} notification={n} onRead={markRead} />
              ))
            )}
          </div>

          {/* Footer — Gmail deep link */}
          <div className="border-t border-border/30 px-4 py-3">
            <button
              onClick={() => openGmail(userEmail)}
              className="flex items-center justify-center gap-2 w-full rounded-md border border-border/50 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Gmail inbox
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
