// src/pages/PurchasePage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent } from "@/contexts/EventContext";
import { useTicket } from "@/contexts/TicketContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Download, Share2, Check, Loader2, Tag, ArrowLeft, Bitcoin, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Event } from "@/types";
import QRCode from "react-qr-code";

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
  serviceFee: number;
  organizerPayout: number;
  feeMode: 'pass_to_buyer' | 'absorb';
}

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
  const buyerTotal = buyerPricePerTicket * quantity;
  const platformFee = buyerTotal * PLATFORM_RATE;
  const bukrshieldFee = shield * quantity;
  const paystackFee = buyerTotal * PAYSTACK_RATE;
  const organizerPayout = buyerTotal - paystackFee - platformFee - bukrshieldFee;
  const serviceFee = buyerTotal - (feeMode === 'pass_to_buyer' ? desiredPayoutPerTicket * quantity : organizerPayout);
  return { buyerPricePerTicket, buyerTotal, serviceFee: Math.max(0, serviceFee), organizerPayout, feeMode };
}

function fmtPrice(n: number, symbol: string): string {
  return symbol + Math.round(n).toLocaleString();
}
// ─────────────────────────────────────────────────────────────────────────────

const PurchasePage = () => {
  const { eventKey } = useParams<{ eventKey: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getEventByKey, validatePromo } = useEvent();
  const { purchaseTicket } = useTicket();
  const { user } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get("ref");

  const [step, setStep] = useState<"rating" | "quantity" | "success">("rating");
  const [rating, setRating] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketId, setTicketId] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventKey) {
        navigate("/app");
        return;
      }
      setLoadingEvent(true);
      const foundEvent = await getEventByKey(eventKey);
      if (foundEvent) {
        setEvent(foundEvent);
        if (referralCode) {
          const collaboratorDiscount = 10;
          setDiscount(collaboratorDiscount);
          setPromoApplied(true);
          setPromoCode(`REF-${referralCode}`);
          toast({
            title: "Referral discount applied",
            description: `You got a ${collaboratorDiscount}% discount from your referral!`,
          });
        }
      } else {
        navigate("/app");
        toast({
          title: "Event not found",
          description: "The event you are looking for does not exist.",
          variant: "destructive",
        });
      }
      setLoadingEvent(false);
    };
    fetchEvent();
  }, [eventKey]);

  const applyPromoCode = async () => {
    if (!event || !promoCode.trim()) return;

    setIsProcessing(true);
    try {
      const validPromo = await validatePromo(event.id, promoCode.toUpperCase());
      if (validPromo && validPromo.isActive && validPromo.usedCount < validPromo.ticketLimit) {
        setDiscount(validPromo.discountPercentage);
        setPromoApplied(true);
        toast({
          title: "Promo code applied",
          description: `You got a ${validPromo.discountPercentage}% discount!`,
        });
      } else {
        throw new Error("Invalid promo code");
      }
    } catch (error) {
      toast({
        title: "Invalid promo code",
        description: "The promo code is invalid, expired, or has reached its usage limit.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRatingSubmit = () => {
    setStep("quantity");
  };

  const handleQuantitySubmit = async () => {
    if (!event || !user) {
      toast({
        title: "Error",
        description: "Please log in to purchase tickets.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (quantity < 1 || quantity > 10) {
      toast({
        title: "Error",
        description: "Please select between 1 and 10 tickets.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await purchaseTicket({
        eventId: event.id,
        quantity,
        ticketType: "General Admission",
        promoCode: promoApplied ? promoCode : undefined,
        excitementRating: rating,
        paymentProvider: "paystack",
        referralCode: referralCode || undefined,
      });

      setTicketId(result.ticket.ticketId);

      // If payment provider returns an authorization URL, redirect
      if (result.payment?.authorizationUrl) {
        setPaymentUrl(result.payment.authorizationUrl);
        window.location.href = result.payment.authorizationUrl;
        return;
      }

      // For free events or pre-authorized payments, go straight to success
      setStep("success");
      toast({
        title: "Purchase Successful",
        description: `You have purchased ${quantity} ticket(s) for ${event.title}!`,
      });
    } catch (error: any) {
      toast({
        title: "Purchase Failed",
        description: error.message || "An error occurred while processing your purchase. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShare = () => {
    if (!event) return;

    const shareData = {
      title: `My ticket for ${event.title}`,
      text: `Check out my ticket for ${event.title} on ${event.date}!`,
      url: `${window.location.origin}/events/${event.eventKey}?ref=${user?.id || "user"}`,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(() => {
        toast({
          title: "Share Failed",
          description: "Unable to share ticket. Please try copying the link manually.",
          variant: "destructive",
        });
      });
    } else {
      navigator.clipboard.writeText(shareData.url);
      toast({
        title: "Link Copied",
        description: "Event link copied to clipboard!",
      });
    }
  };

  const handleDownload = () => {
    if (!event || !ticketId) return;

    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = "#000000";
      ctx.font = "16px Arial";
      ctx.fillText(`Ticket: ${ticketId}`, 10, 20);
      ctx.fillText(`Event: ${event.title}`, 10, 40);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `ticket-${ticketId}.png`;
      link.click();
    }

    toast({
      title: "Download Started",
      description: `Downloading ticket for ${event.title}`,
    });
  };

  const renderStars = () => (
    <div className="flex justify-center gap-2 my-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setRating(star)}
          className="focus:outline-none touch-target"
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

  if (loadingEvent) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return null;

  const currencySymbol = event.currency === 'NGN' ? '₦' : '$';
  const basePrice = event.price || 0;
  const discountAmount = basePrice * (discount / 100);
  const finalPrice = basePrice - discountAmount;
  const totalPrice = finalPrice * quantity;

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/app")}
          className="p-2 hover-glow"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline logo font-medium">Back</span>
        </Button>
        <AnimatedLogo size="sm" />
      </div>

      <div className="max-w-md mx-auto">
        <Dialog open={true} onOpenChange={() => navigate("/app")}>
          <DialogContent className="glass-card border-glass-border max-w-md mx-4 rounded-[var(--radius)]">
            {step === "rating" && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-center logo">Rate Your Excitement</DialogTitle>
                  <DialogDescription className="text-center font-montserrat">
                    How excited are you about attending {event.title}?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                    <span className="text-6xl">{event.emoji || "🎉"}</span>
                  </div>
                  {renderStars()}
                  <p className="text-center text-muted-foreground font-montserrat mb-6">
                    {rating === 0
                      ? "Tap a star to rate"
                      : rating === 1
                      ? "Not very excited"
                      : rating === 2
                      ? "Somewhat excited"
                      : rating === 3
                      ? "Excited"
                      : rating === 4
                      ? "Very excited"
                      : "Extremely excited!"}
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="glow"
                    className="logo font-medium hover-glow"
                    onClick={handleRatingSubmit}
                    disabled={rating === 0}
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === "quantity" && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-center logo">Select Tickets</DialogTitle>
                  <DialogDescription className="text-center font-montserrat">
                    How many tickets would you like to purchase?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <div className="mb-6">
                    <Label htmlFor="quantity" className="font-montserrat">Number of Tickets</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="touch-target hover-glow"
                      >
                        -
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max="10"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
                        }
                        className="text-center glass-card border-glass-border bg-glass/20"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="touch-target hover-glow"
                      >
                        +
                      </Button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <Label htmlFor="promoCode" className="font-montserrat">Promo Code (Optional)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="promoCode"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter promo code"
                        disabled={promoApplied}
                        className={`glass-card border-glass-border ${
                          promoApplied ? "bg-primary/10" : ""
                        }`}
                      />
                      <Button
                        variant="outline"
                        onClick={applyPromoCode}
                        disabled={isProcessing || !promoCode.trim() || promoApplied}
                        className="touch-target hover-glow"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : promoApplied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Tag className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {promoApplied && (
                      <p className="text-xs text-primary mt-1 font-montserrat">
                        {discount}% discount applied!
                      </p>
                    )}
                  </div>

                  {(() => {
                    const discountedPayout = basePrice * (1 - discount / 100);
                    const fees = computeFees(discountedPayout, quantity, 'pass_to_buyer');
                    return (
                      <div className="mb-6 rounded-xl border border-border/40 overflow-hidden">
                        <div className="p-4 bg-primary/5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-sm text-muted-foreground font-montserrat">Total</span>
                            <span className="text-2xl font-bold tracking-tight">
                              {fees.buyerTotal === 0 ? 'Free' : fmtPrice(fees.buyerTotal, currencySymbol)}
                            </span>
                          </div>
                          {discount > 0 && (
                            <p className="text-xs text-primary mt-0.5 font-montserrat">{discount}% promo discount applied</p>
                          )}
                          {fees.buyerTotal > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5 font-montserrat">All fees included · No hidden charges</p>
                          )}
                        </div>
                        {fees.buyerTotal > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowBreakdown(v => !v)}
                              className="w-full flex items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border/30"
                            >
                              <span>View price details</span>
                              {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                            {showBreakdown && (
                              <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-border/20 bg-background/50">
                                <div className="flex justify-between text-sm font-montserrat">
                                  <span className="text-muted-foreground">Ticket{quantity > 1 ? ` × ${quantity}` : ''}</span>
                                  <span>{fmtPrice(basePrice * (1 - discount / 100) * quantity, currencySymbol)}</span>
                                </div>
                                {fees.serviceFee > 0 && (
                                  <div className="flex justify-between text-sm font-montserrat">
                                    <span className="text-muted-foreground">Service &amp; protection</span>
                                    <span>{fmtPrice(fees.serviceFee, currencySymbol)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm font-semibold pt-1.5 border-t border-border/30 font-montserrat">
                                  <span>Total</span>
                                  <span>{fmtPrice(fees.buyerTotal, currencySymbol)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground pt-1 font-montserrat">
                                  Includes platform service, secure payment processing, and ticket protection.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                        {fees.buyerTotal > 0 && (
                          <div className="mx-4 mb-4 flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground font-montserrat">
                              <span className="font-medium text-foreground">BukrShield protected</span>
                              {' '}— Instant QR delivery, fraud protection &amp; transfer support included.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="glow"
                    className="logo font-medium hover-glow w-full"
                    onClick={handleQuantitySubmit}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Pay with Paystack"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="logo font-medium w-full opacity-50 cursor-not-allowed"
                    disabled
                    title="Coming soon"
                  >
                    <Bitcoin className="mr-2 h-4 w-4" />
                    Pay with Crypto
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">Soon</span>
                  </Button>
                </div>
              </>
            )}

            {step === "success" && (
              <>
                <DialogHeader>
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <DialogTitle className="text-center logo">Booking Successful!</DialogTitle>
                  <DialogDescription className="text-center font-montserrat">
                    Your tickets for {event.title} have been confirmed.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <div className="bg-glass/20 p-4 rounded-xl mb-4">
                    <div className="bg-white p-3 rounded-lg w-fit mx-auto mb-4">
                      <QRCode
                        value={JSON.stringify({ ticketId, eventKey: event.eventKey })}
                        size={180}
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                        viewBox="0 0 256 256"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground font-montserrat">Ticket ID</p>
                      <p className="font-mono font-medium logo">{ticketId}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-6 text-sm font-montserrat">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event:</span>
                      <span className="truncate max-w-[60%]">{event.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{new Date(event.date).toLocaleDateString()} • {event.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tickets:</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Paid:</span>
                      <span>{currencySymbol}{totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    className="logo font-medium flex-1 hover-glow"
                    onClick={handleShare}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="glow"
                    className="logo font-medium flex-1 hover-glow"
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PurchasePage;
