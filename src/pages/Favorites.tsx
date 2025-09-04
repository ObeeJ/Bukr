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
import { toast } from "@/components/ui/use-toast";

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <AnimatedLogo />
        <h1 className="text-2xl font-semibold tracking-tight">My Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <p className="text-muted-foreground">You have no favorites saved yet.</p>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <TooltipProvider>
            {favorites.map((event) => (
              <Card key={event.id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{event.emoji}</span>
                    <Badge>{event.category}</Badge>
                  </div>
                  <h2 className="font-bold text-lg">{event.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {event.date} at {event.time}
                  </p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{event.location}</p>
                  <p className="text-sm font-medium">{event.price}</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>{i < event.rating ? "⭐" : "☆"}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button className="w-full" onClick={() => openModal(event)}>
                      View Details
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
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
        <DialogContent>
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {selectedEvent.emoji} {selectedEvent.title}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <strong>Date:</strong> {selectedEvent.date} at {selectedEvent.time}
                </p>
                <p>
                  <strong>Location:</strong> {selectedEvent.location}
                </p>
                <p>
                  <strong>Category:</strong> {selectedEvent.category}
                </p>
                <p>
                  <strong>Price:</strong> {selectedEvent.price}
                </p>
                <p>
                  <strong>Description:</strong> {selectedEvent.description}
                </p>
              </div>
              <div className="mt-4">
                <Button onClick={() => handleBookNow(selectedEvent)}>Book Now</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
