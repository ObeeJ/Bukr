import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Trash, Loader2, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';

interface PromoCode {
  id: string;
  code: string;
  discountPercentage: number;
  ticketLimit: number;
  usedCount: number;
  isActive: boolean;
}

interface PromoCodeManagerProps {
  eventId: string;
  eventName: string;
}

const PromoCodeManager = ({ eventId, eventName }: PromoCodeManagerProps) => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // In a real app, this would be fetched from an API
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
    {
      id: '1',
      code: 'WELCOME10',
      discountPercentage: 10,
      ticketLimit: 50,
      usedCount: 12,
      isActive: true
    },
    {
      id: '2',
      code: 'EARLYBIRD20',
      discountPercentage: 20,
      ticketLimit: 20,
      usedCount: 20,
      isActive: false
    }
  ]);
  
  const [newPromoCode, setNewPromoCode] = useState<Omit<PromoCode, 'id' | 'usedCount' | 'isActive'>>({
    code: '',
    discountPercentage: 10,
    ticketLimit: 20
  });

  const handleAddPromoCode = () => {
    setIsProcessing(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      const promoCode: PromoCode = {
        ...newPromoCode,
        id: Date.now().toString(),
        usedCount: 0,
        isActive: true
      };
      
      setPromoCodes([...promoCodes, promoCode]);
      setNewPromoCode({
        code: '',
        discountPercentage: 10,
        ticketLimit: 20
      });
      
      setIsProcessing(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Promo code created",
        description: `${promoCode.code} has been created successfully.`
      });
    }, 1000);
  };

  const handleTogglePromoCode = (id: string) => {
    setPromoCodes(promoCodes.map(code => 
      code.id === id ? { ...code, isActive: !code.isActive } : code
    ));
    
    const code = promoCodes.find(c => c.id === id);
    if (code) {
      toast({
        title: code.isActive ? "Promo code deactivated" : "Promo code activated",
        description: `${code.code} has been ${code.isActive ? 'deactivated' : 'activated'}.`
      });
    }
  };

  const handleRemovePromoCode = (id: string) => {
    const code = promoCodes.find(c => c.id === id);
    setPromoCodes(promoCodes.filter(c => c.id !== id));
    
    if (code) {
      toast({
        title: "Promo code removed",
        description: `${code.code} has been removed successfully.`
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    
    toast({
      title: "Copied to clipboard",
      description: "The promo code has been copied to your clipboard."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Promo Codes</h2>
        <Button 
          variant="glow" 
          onClick={() => setIsAddDialogOpen(true)}
          className="logo font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Promo Code
        </Button>
      </div>
      
      {promoCodes.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <p className="text-muted-foreground mb-4">No promo codes created yet</p>
          <Button 
            variant="outline" 
            onClick={() => setIsAddDialogOpen(true)}
            className="logo font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Promo Code
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoCodes.map(promoCode => (
            <Card key={promoCode.id} className={`glass-card ${!promoCode.isActive ? 'opacity-70' : ''}`}>
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{promoCode.code}</CardTitle>
                    <CardDescription>{promoCode.discountPercentage}% discount</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemovePromoCode(promoCode.id)}
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Limit:</span>
                  <span className="font-medium">{promoCode.ticketLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Used:</span>
                  <span className="font-medium">{promoCode.usedCount} / {promoCode.ticketLimit}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(promoCode.usedCount / promoCode.ticketLimit) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className={`font-medium ${promoCode.isActive ? 'text-green-500' : 'text-red-500'}`}>
                    {promoCode.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="logo font-medium"
                  onClick={() => copyToClipboard(promoCode.code)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
                <Button 
                  variant={promoCode.isActive ? "destructive" : "outline"} 
                  size="sm"
                  className="logo font-medium"
                  onClick={() => handleTogglePromoCode(promoCode.id)}
                >
                  {promoCode.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Promo Code Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a promo code for {eventName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Promo Code</Label>
              <Input 
                id="code" 
                value={newPromoCode.code}
                onChange={(e) => setNewPromoCode({...newPromoCode, code: e.target.value.toUpperCase()})}
                className="glass-card border-glass-border bg-glass/20"
                placeholder="e.g. WELCOME10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use uppercase letters and numbers only.
              </p>
            </div>
            <div>
              <Label>Discount Percentage ({newPromoCode.discountPercentage}%)</Label>
              <Slider 
                defaultValue={[newPromoCode.discountPercentage]} 
                max={50}
                step={5}
                onValueChange={(value) => setNewPromoCode({...newPromoCode, discountPercentage: value[0]})}
                className="my-2"
              />
              <p className="text-xs text-muted-foreground">
                Discount percentage: {newPromoCode.discountPercentage}% (max 50%)
              </p>
            </div>
            <div>
              <Label>Ticket Limit ({newPromoCode.ticketLimit})</Label>
              <Slider 
                defaultValue={[newPromoCode.ticketLimit]} 
                max={100}
                step={5}
                onValueChange={(value) => setNewPromoCode({...newPromoCode, ticketLimit: value[0]})}
                className="my-2"
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of tickets this code can be used for: {newPromoCode.ticketLimit}
              </p>
            </div>
            <div className="pt-4">
              <Button 
                variant="glow" 
                className="w-full logo font-medium"
                onClick={handleAddPromoCode}
                disabled={isProcessing || !newPromoCode.code}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Tag className="mr-2 h-4 w-4" />
                    Create Promo Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromoCodeManager;