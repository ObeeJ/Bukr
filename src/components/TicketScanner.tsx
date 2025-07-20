import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Camera, Loader2, QrCode, Ticket } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useParams, useSearchParams } from 'react-router-dom';

interface ScanResult {
  id: string;
  ticketId: string;
  eventId: string;
  userName: string;
  ticketType: string;
  timestamp: string;
  status: 'valid' | 'invalid' | 'used';
}

const TicketScanner = () => {
  const { toast } = useToast();
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const accessCode = searchParams.get('code');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [manualTicketId, setManualTicketId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(!accessCode);
  const [enteredAccessCode, setEnteredAccessCode] = useState(accessCode || '');
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (accessCode) {
      verifyAccessCode(accessCode);
    }
  }, [accessCode]);
  
  const verifyAccessCode = (code: string) => {
    setIsProcessing(true);
    
    // In a real app, this would verify the code with an API
    setTimeout(() => {
      setIsProcessing(false);
      setAccessVerified(true);
      setAccessDialogOpen(false);
      
      toast({
        title: "Access granted",
        description: "You now have access to scan tickets for this event."
      });
    }, 1000);
  };
  
  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        
        // In a real app, this would use a QR code scanning library
        // For now, we'll simulate scanning after a delay
        setTimeout(() => {
          simulateScan();
        }, 3000);
      }
    } catch (err) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to scan tickets.",
        variant: "destructive"
      });
    }
  };
  
  const stopScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };
  
  const simulateScan = () => {
    // Simulate a successful scan
    const result: ScanResult = {
      id: Math.random().toString(36).substring(2, 9),
      ticketId: `BUKR-${Math.floor(Math.random() * 10000)}-${eventId}`,
      eventId: eventId || '123',
      userName: 'Alex Johnson',
      ticketType: 'General Admission',
      timestamp: new Date().toISOString(),
      status: Math.random() > 0.2 ? 'valid' : (Math.random() > 0.5 ? 'invalid' : 'used')
    };
    
    setScanResult(result);
    setResultDialogOpen(true);
    stopScanner();
    
    // Add to recent scans if valid
    if (result.status === 'valid') {
      setRecentScans(prev => [result, ...prev].slice(0, 10));
    }
  };
  
  const handleManualEntry = () => {
    setIsProcessing(true);
    
    // In a real app, this would verify the ticket ID with an API
    setTimeout(() => {
      const result: ScanResult = {
        id: Math.random().toString(36).substring(2, 9),
        ticketId: manualTicketId,
        eventId: eventId || '123',
        userName: 'Manual Entry User',
        ticketType: 'General Admission',
        timestamp: new Date().toISOString(),
        status: Math.random() > 0.2 ? 'valid' : (Math.random() > 0.5 ? 'invalid' : 'used')
      };
      
      setScanResult(result);
      setResultDialogOpen(true);
      setIsProcessing(false);
      setManualTicketId('');
      setIsManualEntry(false);
      
      // Add to recent scans if valid
      if (result.status === 'valid') {
        setRecentScans(prev => [result, ...prev].slice(0, 10));
      }
    }, 1000);
  };

  if (!accessVerified) {
    return (
      <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Enter Access Code</DialogTitle>
            <DialogDescription>
              Please enter the access code provided by the event organizer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="accessCode">Access Code</Label>
              <Input 
                id="accessCode" 
                value={enteredAccessCode}
                onChange={(e) => setEnteredAccessCode(e.target.value)}
                className="glass-card border-glass-border bg-glass/20"
                placeholder="e.g. EVENT-ABC123"
              />
            </div>
            <Button 
              variant="glow" 
              className="w-full logo font-medium"
              onClick={() => verifyAccessCode(enteredAccessCode)}
              disabled={isProcessing || !enteredAccessCode}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Access"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Ticket Scanner</h2>
        <div className="flex gap-2">
          <Button 
            variant={isManualEntry ? "outline" : "glow"} 
            onClick={() => {
              setIsManualEntry(false);
              if (!isScanning) startScanner();
            }}
            className="logo font-medium"
            disabled={isScanning}
          >
            <Camera className="w-4 h-4 mr-2" />
            Scan QR
          </Button>
          <Button 
            variant={isManualEntry ? "glow" : "outline"} 
            onClick={() => {
              stopScanner();
              setIsManualEntry(true);
            }}
            className="logo font-medium"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Manual Entry
          </Button>
        </div>
      </div>
      
      {isScanning ? (
        <div className="relative">
          <div className="aspect-square max-w-md mx-auto overflow-hidden rounded-xl border-2 border-primary">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[3px] border-primary/50 rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-primary rounded-lg" />
            </div>
          </div>
          <div className="text-center mt-4">
            <p className="text-muted-foreground mb-4">Position the QR code within the frame</p>
            <Button 
              variant="outline" 
              onClick={stopScanner}
              className="logo font-medium"
            >
              Cancel Scan
            </Button>
          </div>
        </div>
      ) : isManualEntry ? (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Manual Ticket Entry</CardTitle>
            <CardDescription>Enter the ticket ID manually</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ticketId">Ticket ID</Label>
                <Input 
                  id="ticketId" 
                  value={manualTicketId}
                  onChange={(e) => setManualTicketId(e.target.value)}
                  className="glass-card border-glass-border bg-glass/20"
                  placeholder="e.g. BUKR-12345-EVENT"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="glow" 
              className="w-full logo font-medium"
              onClick={handleManualEntry}
              disabled={isProcessing || !manualTicketId}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Ticket"
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="text-center py-12 glass-card">
          <Ticket className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-6">Ready to scan tickets</p>
          <Button 
            variant="glow" 
            onClick={startScanner}
            className="logo font-medium"
          >
            <Camera className="w-4 h-4 mr-2" />
            Start Scanning
          </Button>
        </div>
      )}
      
      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Recent Scans</h3>
          <div className="space-y-2">
            {recentScans.map(scan => (
              <Card key={scan.id} className="glass-card">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{scan.userName}</p>
                    <p className="text-sm text-muted-foreground">{scan.ticketType}</p>
                    <p className="text-xs text-muted-foreground">{scan.ticketId}</p>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-2">
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      {/* Scan Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Scan Result</DialogTitle>
          </DialogHeader>
          {scanResult && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {scanResult.status === 'valid' ? (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="w-8 h-8 text-red-600" />
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <h3 className="text-xl font-bold mb-1">
                  {scanResult.status === 'valid' ? 'Valid Ticket' : 
                   scanResult.status === 'used' ? 'Already Used' : 'Invalid Ticket'}
                </h3>
                <p className="text-muted-foreground">
                  {scanResult.status === 'valid' ? 'This ticket is valid and can be used.' : 
                   scanResult.status === 'used' ? 'This ticket has already been scanned.' : 
                   'This ticket is not valid for this event.'}
                </p>
              </div>
              
              <div className="space-y-2 p-4 bg-primary/10 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="font-medium">{scanResult.userName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Type:</span>
                  <span className="font-medium">{scanResult.ticketType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ticket ID:</span>
                  <span className="font-mono text-sm">{scanResult.ticketId}</span>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="glow" 
                  className="w-full logo font-medium"
                  onClick={() => {
                    setResultDialogOpen(false);
                    startScanner();
                  }}
                >
                  Scan Next Ticket
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketScanner;