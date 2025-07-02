import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock, Users, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import ExcitementRating from "./ExcitementRating";

interface BookingModalProps {
  event: {
    title: string;
    location: string;
    date: string;
    time: string;
    price: number;
    image: string;
    isVirtual?: boolean;
  };
  trigger: React.ReactNode;
}

const BookingModal = ({ event, trigger }: BookingModalProps) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [step, setStep] = useState<"rating" | "details" | "seats" | "confirm">("rating");
  const [excitementRating, setExcitementRating] = useState(0);

  // Mock seat data - in real app this would come from API
  const seatRows = ['A', 'B', 'C', 'D', 'E'];
  const seatsPerRow = 12;
  const unavailableSeats = ['A-3', 'A-4', 'B-7', 'C-5', 'C-6', 'D-8'];

  const generateSeats = () => {
    const seats = [];
    for (const row of seatRows) {
      for (let i = 1; i <= seatsPerRow; i++) {
        const seatId = `${row}-${i}`;
        seats.push({
          id: seatId,
          row,
          number: i,
          isAvailable: !unavailableSeats.includes(seatId),
          isSelected: selectedSeats.includes(seatId)
        });
      }
    }
    return seats;
  };

  const handleSeatClick = (seatId: string) => {
    const seat = generateSeats().find(s => s.id === seatId);
    if (!seat?.isAvailable) return;

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== seatId));
    } else if (selectedSeats.length < quantity) {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const total = event.price * quantity;

  const renderSeatSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-full h-3 bg-gradient-to-r from-primary/20 to-accent/20 rounded-lg mb-4" />
        <p className="text-sm text-muted-foreground">Screen/Stage</p>
      </div>

      <div className="space-y-2">
        {seatRows.map(row => (
          <div key={row} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm font-medium text-muted-foreground">{row}</span>
            <div className="flex gap-1 flex-1 justify-center">
              {Array.from({ length: seatsPerRow }, (_, i) => {
                const seatId = `${row}-${i + 1}`;
                const seat = generateSeats().find(s => s.id === seatId);
                return (
                  <button
                    key={seatId}
                    onClick={() => handleSeatClick(seatId)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200",
                      seat?.isSelected
                        ? "bg-primary text-primary-foreground scale-110"
                        : seat?.isAvailable
                        ? "bg-glass/40 text-foreground hover:bg-glass/60 hover:scale-105"
                        : "bg-destructive/20 text-destructive cursor-not-allowed opacity-50"
                    )}
                    disabled={!seat?.isAvailable}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-glass/40" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/20" />
          <span>Taken</span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            {step === "rating" && "Rate Your Excitement"}
            {step === "details" && "Event Details"}
            {step === "seats" && "Select Seats"}
            {step === "confirm" && "Confirm Booking"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Info Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
              {event.image}
            </div>
            <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center justify-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{event.time}</span>
                </div>
              </div>
            </div>
          </div>

          {step === "rating" && (
            <div className="space-y-6">
              <ExcitementRating 
                value={excitementRating}
                onRatingChange={setExcitementRating}
              />
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="glow" 
                  className="flex-1"
                  onClick={() => setStep("details")}
                  disabled={excitementRating === 0}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-6">
              {/* Quantity Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Select quantity</span>
                </div>
                
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  
                  <div className="text-2xl font-bold text-foreground w-12 text-center">
                    {quantity}
                  </div>
                  
                  <Button
                    variant="outline" 
                    size="icon"
                    onClick={() => setQuantity(Math.min(10, quantity + 1))}
                    disabled={quantity >= 10}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Total */}
              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="text-3xl font-bold text-foreground">${total}</div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="glow" 
                  className="flex-1"
                  onClick={() => setStep(event.isVirtual ? "confirm" : "seats")}
                >
                  {event.isVirtual ? "Confirm Booking" : "Choose Seats"}
                </Button>
              </div>
            </div>
          )}

          {step === "seats" && (
            <div className="space-y-6">
              {renderSeatSelection()}
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Selected: {selectedSeats.join(", ") || "None"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {quantity - selectedSeats.length} seat(s) remaining
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setStep("details")}
                >
                  Back
                </Button>
                <Button 
                  variant="glow" 
                  className="flex-1"
                  onClick={() => setStep("confirm")}
                  disabled={selectedSeats.length !== quantity}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="space-y-6">
              <div className="glass-card p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event:</span>
                  <span className="font-medium">{event.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{event.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">{event.time}</span>
                </div>
                {!event.isVirtual && selectedSeats.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seats:</span>
                    <span className="font-medium">{selectedSeats.join(", ")}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-glass-border/30">
                  <span>Total:</span>
                  <span>${total}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setStep(event.isVirtual ? "details" : "seats")}
                >
                  Back
                </Button>
                <Button variant="glow" className="flex-1">
                  Confirm Booking
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;