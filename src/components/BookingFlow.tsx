import React, { useState } from 'react';
import { useEvent } from '@/contexts/EventContext';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Loader2, Tag, Check, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { purchaseTicket } from "@/api/tickets";
import { useNavigate } from "react-router-dom";

// ── Fee engine (mirrors Rust fees.rs exactly) ─────────────────────────────────
const PAYSTACK_RATE = 0.015;
const PLATFORM_RATE = 0.02;
const DIVISOR = 1 - PAYSTACK_RATE - PLATFORM_RATE; // 0.965

function ceilTo(value: number, nearest: number): number {
  return Math.ceil(value / nearest) * nearest;
}

interface FeeBreakdown {
  buyerPricePerTicket: number;
  buyerTotal: number;
  serviceFee: number;        // platform_fee + bukrshield — shown as one line
  organizerPayout: number;
  feeMode: 'pass_to_buyer' | 'absorb';
}

// Compute buyer-facing fee breakdown.
// feeMode: 'pass_to_buyer' = organizer set desired payout, we gross up
//          'absorb'        = organizer set ticket price, fees come from their payout
function computeFees(
  desiredPayoutPerTicket: number,
  quantity: number,
  feeMode: 'pass_to_buyer' | 'absorb' = 'pass_to_buyer'
): FeeBreakdown {
  if (desiredPayoutPerTicket === 0) {
    return { buyerPricePerTicket: 0, buyerTotal: 0, serviceFee: 0, organizerPayout: 0, feeMode };
  }

  const shield = desiredPayoutPerTicket < 1000 ? 75 : 100;
  const roundTo = desiredPayoutPerTicket >= 10_000 ? 100 : 50;

  const buyerPricePerTicket = feeMode === 'pass_to_buyer'
    ? ceilTo((desiredPayoutPerTicket + shield) / DIVISOR, roundTo)
    : desiredPayoutPerTicket;

  const buyerTotal     = buyerPricePerTicket * quantity;
  const platformFee    = buyerTotal * PLATFORM_RATE;
  const bukrshieldFee  = shield * quantity;
  const paystackFee    = buyerTotal * PAYSTACK_RATE;
  const organizerPayout = buyerTotal - paystackFee - platformFee - bukrshieldFee;
  const serviceFee     = buyerTotal - (feeMode === 'pass_to_buyer' ? desiredPayoutPerTicket * quantity : organizerPayout);

  return { buyerPricePerTicket, buyerTotal, serviceFee: Math.max(0, serviceFee), organizerPayout, feeMode };
}

function fmt(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

interface BookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id?: string;
    title?: string;
    date?: string;
    time?: string;
    price?: string;
    emoji?: string;
    key?: string;
  };
}

const BookingFlow = ({ isOpen, onClose, event }: BookingFlowProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<'rating' | 'quantity' | 'processing'>('rating');
  const [rating, setRating] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);

  const handleRatingSubmit = () => setStep('quantity');

  const { validatePromo } = useEvent();
  const { user } = useAuth();
  
  const applyPromoCode = async () => {
    setIsProcessing(true);
    try {
      const validPromo = await validatePromo(event.id, promoCode.toUpperCase());
      if (validPromo) {
        setDiscount(validPromo.discountPercentage);
        setPromoApplied(true);
        toast({ title: "Promo code applied", description: `You got a ${validPromo.discountPercentage}% discount!` });
      } else {
        toast({ title: "Invalid promo code", description: "The promo code you entered is invalid or expired.", variant: "destructive" });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Initiate real payment via backend — redirects to Paystack checkout
  const handleQuantitySubmit = async () => {
    if (!event.id) {
      toast({ title: "Error", description: "Invalid event.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const response = await purchaseTicket({
        eventId: event.id,
        quantity,
        promoCode: promoApplied ? promoCode : undefined,
        provider: 'paystack',
        callbackUrl: `${window.location.origin}/#/payment/verify`,
      } as any);
      // Backend returns a Paystack authorization URL — redirect the user there
      const authUrl = (response as any).authorizationUrl || (response as any).authorization_url;
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        toast({ title: "Payment error", description: "Could not initiate payment.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `My ticket for ${event.title}`,
        text: `Check out my ticket for ${event.title} on ${event.date}!`,
        url: globalThis.location.href,
      });
    }
  };

  const renderStars = () => {
    return (
      <div className="flex justify-center gap-2 my-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            className="focus:outline-none"
          >
            <Star
              className={`w-10 h-10 ${
                star <= rating ? "text-primary fill-primary" : "text-muted"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  // Extracted from nested ternary — simpler to read and extend
  const ratingLabels = ['Tap a star to rate', 'Not very excited', 'Somewhat excited', 'Excited', 'Very excited', 'Extremely excited!'];
  const ratingLabel = ratingLabels[rating];

  const rawPrice = Number.parseFloat(event.price?.replace(/[^0-9.]/g, '') ?? '0');
  const discountedPayout = rawPrice * (1 - discount / 100);
  // feeMode comes from event — default pass_to_buyer
  const feeMode = (event as any).feeMode ?? 'pass_to_buyer';
  const fees = computeFees(discountedPayout, quantity, feeMode);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4">
        {step === 'rating' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Rate Your Excitement</DialogTitle>
              <DialogDescription className="text-center">
                How excited are you about attending {event.title}?
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                <span className="text-6xl">{event.emoji}</span>
              </div>
              {renderStars()}
              <p className="text-center text-muted-foreground mb-6">
                {ratingLabel}
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="glow"
                className="logo font-medium"
                onClick={handleRatingSubmit}
                disabled={rating === 0}
              >
                Continue
              </Button>
            </div>
          </>
        )}

        {step === 'quantity' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Select Tickets</DialogTitle>
              <DialogDescription className="text-center">
                How many tickets would you like to purchase?
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="mb-6">
                <Label htmlFor="quantity">Number of Tickets</Label>
                <div className="flex items-center gap-4 mt-2">
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    value={quantity}
                    onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                    className="text-center"
                  />
                  <Button variant="outline" size="icon" onClick={() => setQuantity(Math.min(10, quantity + 1))}>+</Button>
                </div>
              </div>

              <div className="mb-6">
                <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="promoCode"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter promo code"
                    disabled={promoApplied}
                    className={promoApplied ? "bg-primary/10" : ""}
                  />
                  <Button
                    variant="outline"
                    onClick={applyPromoCode}
                    disabled={isProcessing || !promoCode || promoApplied}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : promoApplied ? <Check className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                  </Button>
                </div>
                {promoApplied && <p className="text-xs text-primary mt-1">{discount}% discount applied!</p>}
              </div>

              {/* Price summary — hybrid UI: clean total + expandable breakdown */}
              <div className="mb-6 rounded-xl border border-border/40 overflow-hidden">
                {/* Default view: single clean price */}
                <div className="p-4 bg-primary/5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-2xl font-bold tracking-tight">
                      {fees.buyerTotal === 0 ? 'Free' : fmt(fees.buyerTotal)}
                    </span>
                  </div>
                  {discount > 0 && (
                    <p className="text-xs text-primary mt-0.5">{discount}% promo discount applied</p>
                  )}
                  {fees.buyerTotal > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">All fees included · No hidden charges</p>
                  )}
                </div>

                {/* Expandable breakdown — only shown when buyer taps */}
                {fees.buyerTotal > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowBreakdown(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/30"
                    >
                      <span>View price details</span>
                      {showBreakdown
                        ? <ChevronUp className="h-3.5 w-3.5" />
                        : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {showBreakdown && (
                      <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-border/20 bg-background/50">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ticket{quantity > 1 ? ` × ${quantity}` : ''}</span>
                          <span>{fmt(rawPrice * quantity)}</span>
                        </div>
                        {fees.serviceFee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Service &amp; protection</span>
                            <span>{fmt(fees.serviceFee)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border/30">
                          <span>Total</span>
                          <span>{fmt(fees.buyerTotal)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pt-1">
                          Includes platform service, secure payment processing, and ticket protection.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* BukrShield trust badge — always visible on paid tickets */}
              {fees.buyerTotal > 0 && (
                <div className="mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">BukrShield protected</span>
                    {' '}— Instant QR delivery, fraud protection &amp; transfer support included.
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="glow"
              className="logo font-medium w-full"
              onClick={handleQuantitySubmit}
              disabled={isProcessing}
            >
              {isProcessing
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Redirecting to payment...</>
                : fees.buyerTotal === 0 ? 'Claim Free Ticket' : `Pay ${fmt(fees.buyerTotal)}`}
            </Button>
          </>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Redirecting to payment...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingFlow;