import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { redeemToken } from '@/api/invites';
import AnimatedLogo from '@/components/AnimatedLogo';

// SESSION_KEY: persists the invite token across the login redirect.
// When a guest isn't logged in, we save the token here, redirect to /auth,
// and pick it up again after they sign in or register.
const SESSION_KEY = 'bukr_pending_invite_token';

const InviteRedeemPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const token = searchParams.get('token') ?? '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [eventId, setEventId] = useState('');

  // Step 1: If not logged in, save token and redirect to auth.
  // The Auth page reads SESSION_KEY after login/register and redirects back here.
  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      navigate('/app');
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem(SESSION_KEY, token);
      navigate('/auth?redirect=invite');
      return;
    }
    // Logged in and token present — redeem immediately
    redeem(token);
  }, [authLoading, isAuthenticated, token]);

  const redeem = async (t: string) => {
    setStatus('loading');
    try {
      const result = await redeemToken(t);
      setEventId(result.eventId);
      setStatus('success');
      toast.success('Invitation accepted!', { description: result.message });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.error?.message || err.message || 'Invalid or expired invitation');
    }
  };

  const goToBooking = () => {
    if (eventId) navigate(`/purchase/${eventId}`);
    else navigate('/app');
  };

  if (authLoading || status === 'idle') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-8"><AnimatedLogo size="md" /></div>

      <div className="glass-card w-full max-w-sm p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verifying your invitation…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-1">You're in! 🎉</h1>
              <p className="text-muted-foreground text-sm">
                Your invitation has been confirmed. Proceed to book your ticket.
              </p>
            </div>
            <Button variant="glow" className="w-full" onClick={goToBooking}>
              Book My Ticket →
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <div>
              <h1 className="text-xl font-bold mb-1">Invitation Invalid</h1>
              <p className="text-muted-foreground text-sm">{errorMsg}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => navigate('/app')}>
              Go to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export { SESSION_KEY };
export default InviteRedeemPage;
