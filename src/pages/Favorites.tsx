import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useBooking } from "@/context/BookingContext";
import { AnimatedLogo } from "@/components/shared/AnimatedLogo";
import { toast } from "sonner";

type SimpleEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  category: string;
  emoji: string;
  rating: number;
  description: string;
};

const sampleFavorites: SimpleEvent[] = [
  {
    id: 1,
    title: "Beach Party Night",
    date: "2025-08-20",
    time: "8:00 PM",
    location: "Tarkwa Bay, Lagos",
    price: "₦3,000",
    category: "Nightlife",
    emoji: "🏖️",
    rating: 4,
    description: "A vibrant beach party with music, food, and dance.",
  },
  {
    id: 2,
    title: "Tech Expo 2025",
    date: "2025-09-12",
    time: "10:00 AM",
    location: "Eko Hotel, Lagos",
    price: "₦1,500",
    category: "Technology",
    emoji: "💻",
    rating: 5,
    description: "Explore cutting-edge innovations and networking.",
  },
];

export default function Favorites() {
  const [favorites, setFavorites] = useState<SimpleEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SimpleEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { bookNow } = useBooking();

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("favorites");
    if (stored) {
      setFavorites(JSON.parse(stored));
    } else {
      setFavorites(sampleFavorites); // fallback
    }
  }, []);

  const openModal = (event: SimpleEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const closeModal = () => {
    setIsDialogOpen(false);
    setSelectedEvent(null);
  };

  const removeFromFavorites = (eventId: number) => {
    const updated = favorites.filter((event) => event.id !== eventId);
    setFavorites(updated);
    localStorage.setItem("favorites", JSON.stringify(updated));
    toast({ title: "Removed from favorites" });
  };

  const handleBookNow = (event: SimpleEvent) => {
    bookNow(event);
    toast({ title: "Booking started" });
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto safe-area-pb">
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-2">
        <AnimatedLogo />
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">My Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-muted-foreground text-base">You have no favorites saved yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <TooltipProvider>
            {favorites.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition glass-card">
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{event.emoji}</span>
                    <Badge className="text-xs">{event.category}</Badge>
                  </div>
                  <h2 className="font-bold text-base sm:text-lg leading-tight">{event.title}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {event.date} at {event.time}
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{event.location}</p>
                  <p className="text-sm sm:text-base font-medium text-primary">{event.price}</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 p-4 sm:p-6">
                  <div className="flex gap-1 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="text-sm">{i < event.rating ? "⭐" : "☆"}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button 
                      className="flex-1 h-10 text-sm touch-target" 
                      onClick={() => openModal(event)}
                    >
                      View Details
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-10 w-10 touch-target"
                          onClick={() => removeFromFavorites(event.id)}
                        >
                          💔
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Remove from favorites</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </TooltipProvider>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="mx-4 max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold leading-tight">
                  {selectedEvent.emoji} {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-1 gap-2">
                  <p>
                    <strong className="text-foreground">Date:</strong> <span className="text-muted-foreground">{selectedEvent.date} at {selectedEvent.time}</span>
                  </p>
                  <p>
                    <strong className="text-foreground">Location:</strong> <span className="text-muted-foreground">{selectedEvent.location}</span>
                  </p>
                  <p>
                    <strong className="text-foreground">Category:</strong> <span className="text-muted-foreground">{selectedEvent.category}</span>
                  </p>
                  <p>
                    <strong className="text-foreground">Price:</strong> <span className="text-primary font-medium">{selectedEvent.price}</span>
                  </p>
                </div>
                <div>
                  <strong className="text-foreground">Description:</strong>
                  <p className="text-muted-foreground mt-1 leading-relaxed">{selectedEvent.description}</p>
                </div>
              </div>
              <div className="mt-6">
                <Button 
                  onClick={() => handleBookNow(selectedEvent)} 
                  variant="glow" 
                  className="w-full h-12 touch-target"
                >
                  Book Now
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
