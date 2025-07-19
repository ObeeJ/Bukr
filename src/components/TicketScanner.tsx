import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Upload, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TicketScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: (ticketId: string, isValid: boolean) => void;
}

const TicketScanner = ({ isOpen, onClose, onScanComplete }: TicketScannerProps) => {
  const [scanMode, setScanMode] = useState<"camera" | "file">("camera");
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{ ticketId: string; isValid: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleScan = (data: string | null) => {
    if (data) {
      setScanning(false);
      
      // Mock validation - in real app would check against API
      const isValid = data.startsWith("BUKR-") && data.length > 10;
      
      setScanResult({
        ticketId: data,
        isValid
      });
      
      if (onScanComplete) {
        onScanComplete(data, isValid);
      }
    }
  };

  const handleError = (err: any) => {
    console.error(err);
    toast({
      title: "Scan Error",
      description: "Could not access camera. Please check permissions.",
      variant: "destructive"
    });
    setScanning(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mock QR code processing from image
    // In real app, would use a library to extract QR code data
    setTimeout(() => {
      const mockTicketId = `BUKR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const isValid = Math.random() > 0.3; // 70% chance of being valid
      
      setScanResult({
        ticketId: mockTicketId,
        isValid
      });
      
      if (onScanComplete) {
        onScanComplete(mockTicketId, isValid);
      }
    }, 1500);
  };

  const resetScanner = () => {
    setScanResult(null);
    setScanning(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">Scan Ticket</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="camera" onValueChange={(value) => setScanMode(value as "camera" | "file")}>
          <TabsList className="grid w-full grid-cols-2 glass-card">
            <TabsTrigger value="camera">
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </TabsTrigger>
            <TabsTrigger value="file">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            {scanning ? (
              <div className="aspect-square bg-black rounded-xl flex items-center justify-center">
                <div className="text-center text-white">
                  <p>Camera view would appear here</p>
                  <p className="text-sm text-gray-400 mt-2">Point camera at ticket QR code</p>
                </div>
              </div>
            ) : (
              <Button 
                onClick={() => setScanning(true)}
                variant="outline" 
                className="w-full h-20"
              >
                <Camera className="w-5 h-5 mr-2" />
                Start Camera Scan
              </Button>
            )}
          </TabsContent>

          <TabsContent value="file" className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-glass-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <Upload className="w-10 h-10 text-primary mx-auto mb-2" />
              <p className="font-medium text-foreground">Upload QR Code Image</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click to browse or drag and drop
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </TabsContent>
        </Tabs>

        {scanResult && (
          <div className={`p-4 rounded-xl ${scanResult.isValid ? 'bg-success/20' : 'bg-destructive/20'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${scanResult.isValid ? 'bg-success/30' : 'bg-destructive/30'}`}>
                {scanResult.isValid ? (
                  <Check className="w-5 h-5 text-success-foreground" />
                ) : (
                  <X className="w-5 h-5 text-destructive-foreground" />
                )}
              </div>
              <div>
                <h3 className="font-bold">
                  {scanResult.isValid ? 'Valid Ticket' : 'Invalid Ticket'}
                </h3>
                <p className="text-sm">
                  {scanResult.ticketId}
                </p>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={resetScanner}
              >
                Scan Another
              </Button>
              <Button 
                variant={scanResult.isValid ? "glow" : "destructive"} 
                className="flex-1"
                onClick={onClose}
              >
                {scanResult.isValid ? 'Admit' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TicketScanner;