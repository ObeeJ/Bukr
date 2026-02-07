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
import { AnimatedLogo } from "@/components/shared/AnimatedLogo";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FavoriteEvent } from "@/types";
import { getFavorites, removeFavorite } from "@/api/favorites";

export default function Favorites() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<FavoriteEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      const data = await getFavorites();
      setFavorites(data);
      setLoading(false);
    };
    fetchFavorites();
  }, []);

  const openModal = (event: FavoriteEvent) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const removeFromFavorites = async (eventId: string) => {
    try {
      await removeFavorite(eventId);
      setFavorites(prev => prev.filter(e => e.id !== eventId));
      toast("Removed from favorites");
    } catch {
      toast.error("Failed to remove from favorites");
    }
  };

  const handleBookNow = (event: FavoriteEvent) => {
    navigate(`/purchase/${event.eventKey}`);
  };

  const formatPrice = (event: FavoriteEvent) => {
    if (!event.price || event.price === 0) return 'Free';
    const symbol = event.currency === 'NGN' ? '₦' : '$';
    return `${symbol}${event.price.toLocaleString()}`;
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto safe-area-pb">
      <div className="flex items-center justify-between mb-4 sm:mb-6 px-2">
        <AnimatedLogo />
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">My Favorites</h1>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading favorites...</p>
        </div>
      ) : favorites.length === 0 ? (
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
                    <span className="text-2xl">{event.emoji || '🎉'}</span>
                    <Badge className="text-xs">{event.category}</Badge>
                  </div>
                  <h2 className="font-bold text-base sm:text-lg leading-tight">{event.title}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {event.date} at {event.time}
                  </p>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">{event.location}</p>
                  <p className="text-sm sm:text-base font-medium text-primary">{formatPrice(event)}</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 p-4 sm:p-6">
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="mx-4 max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold leading-tight">
                  {selectedEvent.emoji || '🎉'} {selectedEvent.title}
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
                    <strong className="text-foreground">Price:</strong> <span className="text-primary font-medium">{formatPrice(selectedEvent)}</span>
                  </p>
                  <p>
                    <strong className="text-foreground">Organizer:</strong> <span className="text-muted-foreground">{selectedEvent.organizerName}</span>
                  </p>
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
