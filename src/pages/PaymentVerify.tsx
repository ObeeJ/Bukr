import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const PaymentVerify = () => {
  const { reference } = useParams<{ reference: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setStatus('failed');
        setMessage('Invalid payment reference');
        return;
      }

      try {
        const { data } = await api.get(`/payments/${reference}/verify`);
        
        if (data?.status === 'success') {
          setStatus('success');
          setMessage('Payment successful! Your ticket has been confirmed.');
          toast.success('Payment verified successfully');
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support.');
          toast.error('Payment verification failed');
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.message || 'Failed to verify payment');
        toast.error('Payment verification failed');
      }
    };

    verifyPayment();
  }, [reference]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-card p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Payment</h2>
            <p className="text-muted-foreground">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Button
                variant="glow"
                className="w-full"
                onClick={() => navigate('/tickets')}
              >
                View My Tickets
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/app')}
              >
                Back to Home
              </Button>
            </div>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Payment Failed</h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="flex flex-col gap-3">
              <Button
                variant="glow"
                className="w-full"
                onClick={() => navigate('/app')}
              >
                Back to Home
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = 'mailto:support@bukr.app'}
              >
                Contact Support
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentVerify;
