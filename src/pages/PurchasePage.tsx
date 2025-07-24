import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { useTicket } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuid } from 'uuid';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Download, Share2, Check, Loader2, Tag, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import AnimatedLogo from '@/components/AnimatedLogo';
import { Event } from '@/types';

const PurchasePage = () => {
  const { eventKey } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { events, validatePromo } = useEvent();
  const { saveTicket } = useTicket();
  const { user } = useAuth();
  
  const [step, setStep] = useState<'rating' | 'quantity' | 'payment' | 'success'>('rating');
  const [rating, setRating] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketId, setTicketId] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    // Find event by key
    const foundEvent = events.find(e => e.key === eventKey);
    if (foundEvent) {
      setEvent(foundEvent);
    } else {
      navigate('/app');
    }
  }, [eventKey, events, navigate]);

  const applyPromoCode = () => {
    if (!event) return;
    
    setIsProcessing(true);
    
    // Validate promo code using context
    setTimeout(() => {
      const validPromo = validatePromo(event.id.toString(), promoCode.toUpperCase());
      
      setIsProcessing(false);
      
      if (validPromo && validPromo.isActive && validPromo.usedCount < validPromo.ticketLimit) {
        setDiscount(validPromo.discountPercentage);
        setPromoApplied(true);
        
        toast({
          title: "Promo code applied",
          description: `You got a ${validPromo.discountPercentage}% discount!`,
        });
      } else {
        toast({
          title: "Invalid promo code",
          description: "The promo code you entered is invalid, expired, or has reached its usage limit.",
          variant: "destructive"
        });
      }
    }, 800);
  };

  const handleRatingSubmit = () => {
    setStep('quantity');
  };

  const handleQuantitySubmit = () => {
    if (!event || !user) return;
    
    setIsProcessing(true);
    
    // Simulate payment processing with Paystack
    setTimeout(() => {
      setIsProcessing(false);
      
      // Generate ticket ID and save ticket
      const generatedTicketId = `BUKR-${Math.floor(Math.random() * 10000)}-${event.id}`;
      setTicketId(generatedTicketId);
      
      // Save ticket to context
      saveTicket({
        ticketId: generatedTicketId,
        eventId: event.id.toString(),
        eventKey: event.key || uuid(),
        userEmail: user.email || 'user@example.com',
        userName: user.name || 'User',
        ticketType: 'General Admission',
        quantity: quantity,
        price: `$${totalPrice.toFixed(2)}`
      });
      
      setStep('success');
    }, 2000);
  };

  const handleShare = () => {
    if (!event) return;
    
    if (navigator.share) {
      navigator.share({
        title: `My ticket for ${event.title}`,
        text: `Check out my ticket for ${event.title} on ${event.date}!`,
        url: window.location.href,
      });
    } else {
      alert(`Sharing ticket for ${event.title}`);
    }
  };

  const handleDownload = () => {
    if (!event) return;
    alert(`Downloading ticket for ${event.title}`);
  };

  const renderStars = () => {
    return (
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
  };

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Button onClick={() => navigate('/app')}>Back to Events</Button>
        </div>
      </div>
    );
  }

  // Calculate price with discount
  const basePrice = parseFloat(event.price.replace('$', ''));
  const discountAmount = basePrice * (discount / 100);
  const finalPrice = basePrice - discountAmount;
  const totalPrice = finalPrice * quantity;

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('/app')} className="p-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <AnimatedLogo size="sm" />
      </div>

      <div className="max-w-md mx-auto">
        <Dialog open={true} onOpenChange={() => navigate('/app')}>
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
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="touch-target"
                      >
                        -
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max="10"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.min(10, quantity + 1))}
                        className="touch-target"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  {/* Promo Code */}
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
                        className="touch-target"
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
                      <p className="text-xs text-primary mt-1">
                        {discount}% discount applied!
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2 mb-6 p-4 bg-primary/10 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Price per ticket:</span>
                      <span>${basePrice.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-primary text-sm">
                        <span>Discount ({discount}%):</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Final price per ticket:</span>
                      <span>${finalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-border/30">
                      <span>Total:</span>
                      <span>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="glow"
                    className="logo font-medium"
                    onClick={handleQuantitySubmit}
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

            {step === 'success' && (
              <>
                <DialogHeader>
                  <div className="flex justify-center mb-2">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <DialogTitle className="text-center">Booking Successful!</DialogTitle>
                  <DialogDescription className="text-center">
                    Your tickets for {event.title} have been confirmed.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <div className="bg-white p-4 rounded-xl mb-4">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketId}`} 
                      alt="Ticket QR Code" 
                      className="w-48 h-48 mx-auto mb-4"
                    />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Ticket ID</p>
                      <p className="font-mono font-medium">{ticketId}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event:</span>
                      <span>{event.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{event.date} • {event.time}</span>
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
                    className="logo font-medium flex-1"
                    onClick={handleShare}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="glow"
                    className="logo font-medium flex-1"
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