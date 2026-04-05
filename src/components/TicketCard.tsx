/**
 * TicketCard — Digital ticket display
 *
 * Features:
 * - QR code rendered client-side (react-qr-code, no external service)
 * - Real download: renders QR + ticket details to canvas, saves as PNG
 * - Transfer: permanent ownership transfer via API
 * - Share: Web Share API with clipboard fallback
 */

import React, { useRef, useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Download, Share2, Send, Loader2, RefreshCw } from 'lucide-react';
import { Ticket } from '@/contexts/TicketContext';
import { transferTicket, getTicketQR, renewTicket } from '@/api/tickets';
import { toast } from 'sonner';

interface TicketCardProps {
  ticket: Ticket;
  onTransferred?: () => void;
  onRefresh?: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onTransferred, onRefresh }) => {
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      const result = await renewTicket(ticket.ticketId);
      if (result.requiresPayment) {
        toast.info('Payment required', { description: `Renewal costs ${result.paymentCurrency} ${result.paymentAmount}. Redirecting...` });
      } else {
        toast.success('Ticket renewed!', { description: result.message });
        onRefresh?.();
      }
    } catch (e: any) {
      toast.error('Renewal failed', { description: e.message });
    } finally {
      setIsRenewing(false);
    }
  };
  
  // Dynamic QR state
  const [qrValue, setQrValue] = useState<string>(JSON.stringify({
    ticketId: ticket.ticketId,
    eventKey: ticket.eventKey,
  }));
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // ─── Dynamic QR Refresh ──────────────────────────────────────────────────────
  // Only polls when the card is visible in the viewport (IntersectionObserver).
  // Prevents rate-limit exhaustion when multiple tickets are rendered.
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (ticket.status !== 'valid' || !isVisible) return;

    const refreshQr = async () => {
      try {
        const freshQr = await getTicketQR(ticket.ticketId);
        if (freshQr) {
          setQrValue(freshQr);
          setLastRefresh(Date.now());
        }
      } catch {
        // Silent fail — QR will retry on next interval
      }
    };

    refreshQr();
    const interval = setInterval(refreshQr, 3000);
    return () => clearInterval(interval);
  }, [ticket.ticketId, ticket.status, isVisible]);

  // ─── Download ──────────────────────────────────────────────────────────────
  // Renders QR SVG + ticket details onto a canvas, then saves as PNG.
  // No external service — works fully offline.
  const handleDownload = async () => {
    const svgEl = qrContainerRef.current?.querySelector('svg');
    if (!svgEl) return;

    const canvas = document.createElement('canvas');
    const W = 400;
    const H = 520;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Header bar
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, W, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('BUKR', W / 2, 38);

    // Render QR SVG to image
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 75, 80, 250, 250);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });

    // Ticket details
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(ticket.eventTitle || ticket.eventId || 'Event', W / 2, 360);

    ctx.font = '13px Arial';
    ctx.fillStyle = '#6b7280';
    const details = [
      ticket.ticketId,
      ticket.ticketType,
      ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString() : '',
      ticket.eventLocation || '',
    ].filter(Boolean);

    details.forEach((line, i) => {
      ctx.fillText(line, W / 2, 385 + i * 22);
    });

    // Status badge
    const statusColor = ticket.status === 'valid' ? '#16a34a' : ticket.status === 'used' ? '#d97706' : '#dc2626';
    ctx.fillStyle = statusColor;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(ticket.status.toUpperCase(), W / 2, H - 20);

    // Download
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `bukr-ticket-${ticket.ticketId}.png`;
    link.click();

    toast.success('Ticket downloaded', { description: `${ticket.ticketId}.png saved` });
  };

  // ─── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#/purchase/${ticket.eventKey}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `My ticket — ${ticket.eventTitle || ''}`, url: shareUrl });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied', { description: 'Event link copied to clipboard' });
    }
  };

  // ─── Transfer ──────────────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!transferEmail.trim() || !transferEmail.includes('@')) {
      toast.error('Invalid email', { description: 'Enter a valid email address.' });
      return;
    }
    setIsTransferring(true);
    try {
      await transferTicket(ticket.ticketId, transferEmail.trim());
      toast.success('Ticket transferred', {
        description: `Ownership permanently moved to ${transferEmail}. Your access has been revoked.`,
      });
      setTransferOpen(false);
      setTransferEmail('');
      onTransferred?.();
    } catch (err: any) {
      toast.error('Transfer failed', { description: err.message });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <Card className="glass-card" ref={cardRef}>
        <CardHeader>
          <CardTitle className="truncate">{ticket.eventTitle || ticket.eventId}</CardTitle>
          <CardDescription>{new Date(ticket.purchaseDate).toLocaleDateString()}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center relative">
          {/* Dynamic Refresh Indicator — only for valid tickets */}
          {ticket.status === 'valid' && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-green-500/10 text-green-500 px-2 py-1 rounded-full text-[10px] font-bold border border-green-500/20">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              LIVE
            </div>
          )}

          {/* QR code — client-side, no external service */}
          <div ref={qrContainerRef} className="bg-white p-4 rounded-xl mb-4 relative group">
            <QRCode
              value={qrValue}
              size={200}
              style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
              viewBox="0 0 256 256"
            />
            <p className="text-center text-xs text-black font-mono mt-2">{ticket.ticketId}</p>
          </div>

          <div className="w-full space-y-2 text-sm">
            {ticket.userName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{ticket.userName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{ticket.ticketType}</span>
            </div>
            {/* NEW: Usage display for multi-use tickets */}
            {ticket.usageLimit > 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usages:</span>
                <span className="font-bold text-primary">
                  {ticket.usageCount} / {ticket.usageLimit}
                </span>
              </div>
            )}
            {/* Standard quantity display */}
            {ticket.usageLimit === 1 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Qty:</span>
                <span className="font-medium">{ticket.quantity}</span>
              </div>
            )}
            {ticket.validUntil && (
              <div className="flex justify-between text-amber-500 font-medium">
                <span className="text-muted-foreground">Expires:</span>
                <span>{new Date(ticket.validUntil).toLocaleTimeString()}</span>
              </div>
            )}
            {ticket.price && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-medium">{ticket.price}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span className={`font-medium ${
                ticket.status === 'valid' ? 'text-green-500' :
                ticket.status === 'used' ? 'text-amber-500' : 'text-red-500'
              }`}>
                {ticket.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Usage tracker — only for multi-use tickets */}
          {ticket.usageModel && ticket.usageModel !== 'single' && ticket.usageModel !== 'consumable' && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Uses remaining</span>
                <span className={`text-sm font-bold ${
                  (ticket.usageLeft ?? 0) === 0 ? 'text-red-500' : 'text-primary'
                }`}>
                  {ticket.usageLeft ?? 0} / {ticket.usageTotal ?? ticket.usageLimit ?? '?'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, ((ticket.usageLeft ?? 0) / (ticket.usageTotal ?? ticket.usageLimit ?? 1)) * 100))}%` }}
                />
              </div>
              {ticket.validUntil && (
                <p className="text-xs text-muted-foreground">
                  Expires {new Date(ticket.validUntil).toLocaleString()}
                </p>
              )}
              {(ticket.usageLeft ?? 0) === 0 && ticket.isRenewable && ticket.status === 'valid' && (
                <Button
                  variant="glow" size="sm" className="w-full logo font-medium mt-1"
                  onClick={handleRenew} disabled={isRenewing}
                >
                  {isRenewing
                    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Renewing...</>
                    : <><RefreshCw className="w-3 h-3 mr-1" />Renew Ticket</>
                  }
                </Button>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button variant="outline" className="flex-1 logo font-medium" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />Share
          </Button>
          <Button variant="outline" className="flex-1 logo font-medium" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />Download
          </Button>
          {ticket.status === 'valid' && (
            <Button variant="glow" className="flex-1 logo font-medium" onClick={() => setTransferOpen(true)}>
              <Send className="w-4 h-4 mr-2" />Transfer
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Transfer dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="glass-card border-glass-border max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Transfer Ticket</DialogTitle>
            <DialogDescription>
              This is permanent. You will lose access to this ticket immediately.
              The recipient must have a Bukr account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="transferEmail">Recipient Email</Label>
              <Input
                id="transferEmail"
                type="email"
                placeholder="recipient@example.com"
                value={transferEmail}
                onChange={e => setTransferEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTransfer()}
                className="mt-1"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setTransferOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="glow"
                className="flex-1 logo font-medium"
                onClick={handleTransfer}
                disabled={isTransferring || !transferEmail.trim()}
              >
                {isTransferring
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Transferring...</>
                  : 'Confirm Transfer'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TicketCard;
