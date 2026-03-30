import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Trash, Loader2, Tag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';
import { PromoCode } from '@/types';
import { getEventPromos, createPromo, deletePromo, togglePromo } from '@/api/promos';

interface PromoCodeManagerProps {
  eventId: string;
  eventName: string;
}

const PromoCodeManager = ({ eventId, eventName }: PromoCodeManagerProps) => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const [newPromoCode, setNewPromoCode] = useState<{ code: string; discountPercentage: number; ticketLimit: number }>({
    code: '',
    discountPercentage: 10,
    ticketLimit: 20,
  });

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEventPromos(eventId);
      setPromoCodes(data);
    } catch {
      toast({ title: 'Failed to load promo codes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchPromos();
  }, [fetchPromos]);

  const handleAddPromoCode = async () => {
    if (!newPromoCode.code.trim()) return;
    setIsProcessing(true);
    try {
      await createPromo({ eventId, ...newPromoCode });
      toast({ title: 'Promo code created', description: `${newPromoCode.code} is now active.` });
      setNewPromoCode({ code: '', discountPercentage: 10, ticketLimit: 20 });
      setIsAddDialogOpen(false);
      fetchPromos();
    } catch (err: any) {
      toast({ title: 'Failed to create promo code', description: err.message, variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePromoCode = async (id: string) => {
    try {
      const updated = await togglePromo(id, eventId);
      setPromoCodes(prev => prev.map(c => c.id === id ? updated : c));
      const code = promoCodes.find(c => c.id === id);
      toast({ title: code?.isActive ? 'Promo code deactivated' : 'Promo code activated' });
    } catch (err: any) {
      toast({ title: 'Failed to update promo code', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemovePromoCode = async (id: string) => {
    const code = promoCodes.find(c => c.id === id);
    try {
      await deletePromo(id, eventId);
      setPromoCodes(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Promo code removed', description: `${code?.code} has been deleted.` });
    } catch (err: any) {
      toast({ title: 'Failed to remove promo code', description: err.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Promo Codes</h2>
        <Button variant="glow" onClick={() => setIsAddDialogOpen(true)} className="logo font-medium w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Create Promo Code
        </Button>
      </div>

      {promoCodes.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <p className="text-muted-foreground mb-4">No promo codes created yet</p>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(true)} className="logo font-medium">
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Promo Code
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {promoCodes.map(promoCode => (
            <Card key={promoCode.id} className={`glass-card ${!promoCode.isActive ? 'opacity-70' : ''}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate">{promoCode.code}</CardTitle>
                    <CardDescription>{promoCode.discountPercentage}% discount</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemovePromoCode(promoCode.id)} className="flex-shrink-0">
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ticket Limit:</span>
                  <span className="font-medium">{promoCode.ticketLimit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Used:</span>
                  <span className="font-medium">{promoCode.usedCount} / {promoCode.ticketLimit}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(promoCode.usedCount / promoCode.ticketLimit) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-medium ${promoCode.isActive ? 'text-green-500' : 'text-red-500'}`}>
                    {promoCode.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="logo font-medium flex-1" onClick={() => copyToClipboard(promoCode.code)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Code
                </Button>
                <Button
                  variant={promoCode.isActive ? 'destructive' : 'outline'}
                  size="sm"
                  className="logo font-medium flex-1"
                  onClick={() => handleTogglePromoCode(promoCode.id)}
                >
                  {promoCode.isActive ? 'Deactivate' : 'Activate'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>Create a promo code for {eventName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Promo Code</Label>
              <Input
                id="code"
                value={newPromoCode.code}
                onChange={e => setNewPromoCode({ ...newPromoCode, code: e.target.value.toUpperCase() })}
                className="glass-card border-glass-border bg-glass/20"
                placeholder="e.g. WELCOME10"
              />
              <p className="text-xs text-muted-foreground mt-1">Use uppercase letters and numbers only.</p>
            </div>
            <div>
              <Label>Discount Percentage ({newPromoCode.discountPercentage}%)</Label>
              <Slider
                defaultValue={[newPromoCode.discountPercentage]}
                max={50}
                step={5}
                onValueChange={value => setNewPromoCode({ ...newPromoCode, discountPercentage: value[0] })}
                className="my-2"
              />
            </div>
            <div>
              <Label>Ticket Limit ({newPromoCode.ticketLimit})</Label>
              <Slider
                defaultValue={[newPromoCode.ticketLimit]}
                max={100}
                step={5}
                onValueChange={value => setNewPromoCode({ ...newPromoCode, ticketLimit: value[0] })}
                className="my-2"
              />
            </div>
            <Button
              variant="glow"
              className="w-full logo font-medium"
              onClick={handleAddPromoCode}
              disabled={isProcessing || !newPromoCode.code.trim()}
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Tag className="mr-2 h-4 w-4" />Create Promo Code</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromoCodeManager;
