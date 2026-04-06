import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Loader2, UserCheck, QrCode, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { assignScanner, listScanners, removeScanner, enableScannerMode } from '@/api/events';

interface Scanner {
  id: string;
  scannerUserId: string;
  scannerName?: string;
  scannerEmail?: string;
  assignedAt: string;
  isActive: boolean;
}

const ScannerManagement = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [scannerCode, setScannerCode] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) fetchScanners();
  }, [eventId]);

  const fetchScanners = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await listScanners(eventId);
      setScanners(data);
    } catch {
      toast.error('Failed to load scanners');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!eventId || !email.trim()) { toast.error('Please enter an email address'); return; }
    setAdding(true);
    try {
      await assignScanner(eventId, email.trim());
      toast.success('Scanner assigned successfully');
      setEmail(''); setOpen(false); fetchScanners();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign scanner');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (scannerId: string) => {
    if (!eventId) return;
    try {
      await removeScanner(eventId, scannerId);
      toast.success('Scanner removed');
      setScanners(prev => prev.filter(s => s.id !== scannerId));
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove scanner');
    }
  };

  // Generate a personal ORG-XXXXXX access code so the organiser can scan
  // without needing a separate scanner account.
  // Calls POST /events/:id/scanner-mode — backend generates and stores the code.
  const scannerModeMutation = useMutation({
    mutationFn: () => enableScannerMode(eventId!),
    onSuccess: (res) => {
      setScannerCode(res.code);
      toast.success('Scanner code generated', { description: 'Share this code with your gate staff.' });
    },
    onError: () => toast.error('Failed to generate scanner code'),
  });

  const copyScannerCode = () => {
    if (!scannerCode) return;
    navigator.clipboard.writeText(scannerCode);
    toast.success('Code copied to clipboard');
  };

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-3">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Scanner Management</h1>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Scanner</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Scanner</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scannerEmail">Scanner Email</Label>
                  <Input
                    id="scannerEmail" type="email" placeholder="scanner@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The user must have a Bukr account.
                  </p>
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={adding}>
                  {adding ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Assigning...</> : 'Assign Scanner'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organiser scanner mode — generates ORG-XXXXXX access code */}
        <Card className="glass-card mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" /> Your Scanner Access Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate a personal access code to scan tickets yourself or share with gate staff who don’t have a Bukr account.
            </p>
            {scannerCode ? (
              <div className="flex items-center gap-3">
                <code className="flex-1 px-3 py-2 bg-muted rounded-lg font-mono text-lg tracking-widest text-primary">
                  {scannerCode}
                </code>
                <Button variant="outline" size="icon" onClick={copyScannerCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="glow"
                disabled={scannerModeMutation.isPending}
                onClick={() => scannerModeMutation.mutate()}
              >
                {scannerModeMutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
                  : <><QrCode className="mr-2 h-4 w-4" />Generate Code</>
                }
              </Button>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          </div>
        ) : scanners.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No scanners assigned yet</p>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Add First Scanner</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {scanners.map((scanner) => (
              <Card key={scanner.id} className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UserCheck className="h-5 w-5 mr-2 text-primary" />
                      <span>{scanner.scannerName || scanner.scannerEmail || scanner.scannerUserId}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(scanner.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {scanner.scannerEmail && <p>Email: {scanner.scannerEmail}</p>}
                    <p>Assigned: {new Date(scanner.assignedAt).toLocaleDateString()}</p>
                    <p>Status: {scanner.isActive ? '✓ Active' : '✗ Inactive'}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScannerManagement;
