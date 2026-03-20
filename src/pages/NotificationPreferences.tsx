import { useState } from 'react';
import { ArrowLeft, ScanLine, Zap, Clock, Ticket, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPreferences, NotificationType } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PrefKey = keyof NotificationPreferences;

const PREF_META: { key: PrefKey; type: NotificationType; Icon: React.ElementType; label: string; desc: string; colour: string }[] = [
  {
    key: 'scanConfirmed',
    type: 'scan_confirmed',
    Icon: ScanLine,
    label: 'Scan Confirmed',
    desc: 'Email when your ticket is successfully scanned at entry.',
    colour: 'text-green-400',
  },
  {
    key: 'usageDepleted',
    type: 'usage_depleted',
    Icon: Zap,
    label: 'Uses Depleted',
    desc: 'Email when all uses on a multi-use ticket are consumed.',
    colour: 'text-yellow-400',
  },
  {
    key: 'expiryWarning',
    type: 'expiry_warning',
    Icon: Clock,
    label: 'Expiry Warning',
    desc: 'Email 24 hours before a time-bound ticket expires.',
    colour: 'text-orange-400',
  },
  {
    key: 'expired',
    type: 'expired',
    Icon: Ticket,
    label: 'Ticket Expired',
    desc: 'Email when a ticket passes its valid-until date.',
    colour: 'text-red-400',
  },
  {
    key: 'renewalPrompt',
    type: 'renewal_prompt',
    Icon: RefreshCw,
    label: 'Renewal Ready',
    desc: 'Email prompting you to renew a depleted renewable ticket.',
    colour: 'text-primary',
  },
];

const NotificationPreferencesPage = () => {
  const navigate = useNavigate();
  const { preferences, savePreferences } = useNotifications();
  const [local, setLocal] = useState<NotificationPreferences>({ ...preferences });
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (key: PrefKey) => setLocal(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await savePreferences(local);
      toast.success('Preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = (Object.keys(local) as PrefKey[]).some(k => local[k] !== preferences[k]);

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Notification Preferences</h1>
            <p className="text-sm text-muted-foreground">Choose which emails Bukr sends you</p>
          </div>
        </div>

        <div className="space-y-3 glass-card p-4">
          {PREF_META.map(({ key, Icon, label, desc, colour }) => {
            const enabled = local[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className={cn(
                  'w-full flex items-start gap-4 rounded-xl border px-4 py-4 text-left transition-colors',
                  enabled
                    ? 'border-primary bg-primary/5'
                    : 'border-input bg-background hover:border-primary/40'
                )}
              >
                <div className={cn('mt-0.5 shrink-0', enabled ? colour : 'text-muted-foreground')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', enabled ? '' : 'text-muted-foreground')}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                {/* Toggle pill */}
                <div
                  className={cn(
                    'mt-0.5 shrink-0 h-5 w-9 rounded-full transition-colors relative',
                    enabled ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                      enabled ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <Button
          variant="glow"
          className="w-full h-12 mt-6 cta"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferencesPage;
