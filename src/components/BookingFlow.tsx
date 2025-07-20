import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Download, Share2, Check, Loader2, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface BookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
}

const BookingFlow = ({ isOpen, onClose, event }: BookingFlowProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'rating' | 'quantity' | 'payment' | 'success'>('rating');
  const [rating, setRating] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticketId, setTicketId] = useState<string>("");
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);

  const handleRatingSubmit = () => {
    setStep('quantity');
  };

  const applyPromoCode = () => {
    setIsProcessing(true);
    
    // In a real app, this would validate the promo code with an API
    setTimeout(() => {
      setIsProcessing(false);
      
      // Simulate a valid promo code
      if (promoCode.toUpperCase() === 'BUKR10' || promoCode.toUpperCase() === 'WELCOME') {
        const discountAmount = 10; // 10% discount
        setDiscount(discountAmount);
        setPromoApplied(true);
        
        toast({
          title: "Promo code applied",
          description: `You got a ${discountAmount}% discount!`,
        });
      } else {
        toast({
          title: "Invalid promo code",
          description: "The promo code you entered is invalid or expired.",
          variant: "destructive"
        });
      }
    }, 1000);
  };

  const handleQuantitySubmit = () => {
    setIsProcessing(true);
    
    // Simulate payment processing with Paystack
    setTimeout(() => {
      setIsProcessing(false);
      // Generate a random ticket ID
      setTicketId(`BUKR-${Math.floor(Math.random() * 10000)}-${event.id}`);
      setStep('success');
    }, 2000);
  };

  const handleShare = () => {
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
    // In a real app, this would generate and download a PDF ticket
    alert(`Downloading ticket for ${event.title}`);
  };

  const renderStars = () => {
    return (
      <div className="flex justify-center gap-2 my-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
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

  // Calculate price with discount
  const basePrice = parseFloat(event.price.replace('$', ''));
  const discountAmount = basePrice * (discount / 100);
  const finalPrice = basePrice - discountAmount;
  const totalPrice = finalPrice * quantity;

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
                <div className="flex justify-between">
                  <span>Price per ticket:</span>
                  <span>${basePrice.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Discount ({discount}%):</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
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
              <div className="space-y-2 mb-6">
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
            <div className="flex justify-between">
              <Button
                variant="outline"
                className="logo font-medium"
                onClick={handleShare}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              <Button
                variant="glow"
                className="logo font-medium"
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
  );
};

export default BookingFlow;