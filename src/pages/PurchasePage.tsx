// src/pages/PurchasePage.tsx

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEvent } from "@/contexts/EventContext";
import { useTicket } from "@/contexts/TicketContext";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuid } from "uuid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Download, Share2, Check, Loader2, Tag, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Event, Ticket } from "@/types";

const PurchasePage = () => {
  const { eventKey } = useParams<{ eventKey: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { events, validatePromo } = useEvent();
  const { saveTicket } = useTicket();
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

  useEffect(() => {
    const foundEvent = events.find((e) => e.key === eventKey);
    if (foundEvent) {
      setEvent(foundEvent);
      if (referralCode) {
        const collaboratorDiscount = 10; // Mock 10% referral discount
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
  }, [eventKey, events, navigate, referralCode, toast]);

  const applyPromoCode = async () => {
    if (!event || !promoCode.trim()) return;

    setIsProcessing(true);
    try {
      const validPromo = await validatePromo(event.id.toString(), promoCode.toUpperCase());
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
      const generatedTicketId = `BUKR-${Math.floor(Math.random() * 10000)}-${event.id}`;
      setTicketId(generatedTicketId);

      const ticket: Ticket = {
        ticketId: generatedTicketId,
        eventId: event.id.toString(),
        eventKey: event.key || uuid(),
        userEmail: user.email || "user@example.com",
        userName: user.name || "User",
        ticketType: "General Admission",
        quantity,
        price: `$${totalPrice.toFixed(2)}`,
        purchaseDate: new Date().toISOString(),
      };

      await saveTicket(ticket);
      setStep("success");
      toast({
        title: "Purchase Successful",
        description: `You have purchased ${quantity} ticket(s) for ${event.title}!`,
      });
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: "An error occurred while processing your purchase. Please try again.",
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
      url: `${window.location.origin}/events/${event.key}?ref=${user?.id || "user"}`,
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

    // Simulate ticket download (replace with actual PDF generation in production)
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

  if (!event) return null;

  const basePrice = parseFloat(event.price?.replace("$", "") || "0");
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

                  <div className="space-y-2 mb-6 p-4 bg-glass/20 rounded-lg">
                    <div className="flex justify-between text-sm font-montserrat">
                      <span className="text-muted-foreground">Price per ticket:</span>
                      <span>${basePrice.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-primary text-sm font-montserrat">
                        <span className="text-muted-foreground">Discount ({discount}%):</span>
                        <span>-${(discountAmount * quantity).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t border-border/30 font-montserrat">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="glow"
                    className="logo font-medium hover-glow"
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
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketId}`}
                      alt="Ticket QR Code"
                      className="w-48 h-48 mx-auto mb-4"
                    />
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
                      <span>${totalPrice.toFixed(2)}</span>
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