import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Loader2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { assignScanner, listScanners, removeScanner } from '@/api/events';

interface Scanner {
  id: string;
  userId: string;
  userName?: string;
  email?: string;
  assignedAt: string;
}

const ScannerManagement = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchScanners();
    }
  }, [eventId]);

  const fetchScanners = async () => {
    if (!eventId) return;
    
    setLoading(true);
    try {
      const data = await listScanners(eventId);
      setScanners(data);
    } catch (error) {
      toast.error('Failed to load scanners');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!eventId || !userId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setAdding(true);
    try {
      await assignScanner(eventId, userId);
      toast.success('Scanner assigned successfully');
      setUserId('');
      setOpen(false);
      fetchScanners();
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

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="mr-3"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Scanner Management</h1>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Scanner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Scanner</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userId">User ID or Email</Label>
                  <Input
                    id="userId"
                    placeholder="Enter user ID or email"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The user will be able to scan tickets for this event
                  </p>
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={adding}>
                  {adding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Scanner'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading scanners...</p>
          </div>
        ) : scanners.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="text-center py-12">
              <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No scanners assigned yet</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Scanner
              </Button>
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
                      <span>{scanner.userName || scanner.email || scanner.userId}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(scanner.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>User ID: {scanner.userId}</p>
                    {scanner.email && <p>Email: {scanner.email}</p>}
                    <p>Assigned: {new Date(scanner.assignedAt).toLocaleDateString()}</p>
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
