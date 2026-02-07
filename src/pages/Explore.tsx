import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Event } from '@/types';
import { getAllEvents } from '@/api/events';
import { addFavorite } from '@/api/favorites';
import { toast } from 'sonner';

const Explore = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      const data = await getAllEvents();
      setEvents(data);
      setLoading(false);
    };
    fetchEvents();
  }, []);

  const handleFavorite = async (eventId: string) => {
    try {
      await addFavorite(eventId);
      toast.success('Added to favorites');
    } catch {
      toast.error('Failed to add to favorites');
    }
  };

  const formatPrice = (event: Event) => {
    if (!event.price || event.price === 0) return 'Free';
    const symbol = event.currency === 'NGN' ? '₦' : '$';
    return `${symbol}${event.price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen p-4 safe-area-pb pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/app')}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Explore Events</h1>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events found. Check back later!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="glass-card overflow-hidden hover:shadow-lg transition-all duration-300 group border-primary/10">
                <div className="relative h-48 w-full overflow-hidden">
                  {event.thumbnailUrl ? (
                    <img
                      src={event.thumbnailUrl}
                      alt={event.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="text-6xl">{event.emoji || '🎉'}</span>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/20 backdrop-blur-md hover:bg-background/40 text-white rounded-full h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavorite(event.id);
                    }}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2 text-primary/70" />
                      {event.date} {event.time && `at ${event.time}`}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2 text-primary/70" />
                      {event.location}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-lg font-bold text-primary">{formatPrice(event)}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/events/${event.id}`)}
                        className="text-xs"
                      >
                        View Details
                      </Button>
                      <Button
                        variant="glow"
                        size="sm"
                        className="cta text-xs"
                        onClick={() => navigate(`/purchase/${event.eventKey}`)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
