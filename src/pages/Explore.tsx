import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, MapPin, Calendar, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Event } from '@/types';
import { getAllEvents } from '@/api/events';
import FavoriteButton from '@/components/FavoriteButton';
import { toast } from 'sonner';

// Event types the backend supports via ?event_type= query param
const EVENT_TYPES = ['in_person', 'online', 'hybrid'];

const Explore = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters wired to backend query params: city, event_type, search
  const [cityInput, setCityInput] = useState('');
  const [city, setCity] = useState('');
  const [eventType, setEventType] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const data = await getAllEvents({
          city: city || undefined,
          eventType: eventType || undefined,
          search: search || undefined,
        });
        setEvents(data);
      } catch {
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [city, eventType, search]);

  const applySearch = () => setSearch(searchInput.trim());
  const applyCity = () => setCity(cityInput.trim());
  const clearFilters = () => {
    setCityInput(''); setCity('');
    setEventType('');
    setSearchInput(''); setSearch('');
  };
  const hasFilters = city || eventType || search;

  const formatPrice = (event: Event) => {
    if (!event.price || event.price === 0) return 'Free';
    const symbol = event.currency === 'NGN' ? '₦' : '$';
    return `${symbol}${event.price.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen p-4 safe-area-pb pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')} className="mr-3">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Explore Events</h1>
        </div>

        {/* Filters — all wired to backend query params */}
        <div className="space-y-3 mb-6">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-11"
                placeholder="Search events..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applySearch()}
              />
            </div>
            <Button variant="outline" className="h-11 px-4" onClick={applySearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* City + event type */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 h-10"
                placeholder="City (e.g. Lagos)"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyCity()}
              />
            </div>
            <Button variant="outline" className="h-10 px-3" onClick={applyCity}>
              <MapPin className="h-4 w-4" />
            </Button>
            <select
              className="h-10 px-3 rounded-md border border-border bg-background text-sm"
              value={eventType}
              onChange={e => setEventType(e.target.value)}
            >
              <option value="">All types</option>
              {EVENT_TYPES.map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
            {hasFilters && (
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-3">
              {hasFilters ? 'No events match your filters.' : 'No events found. Check back later!'}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" /> Clear filters
              </Button>
            )}
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
                  {/* Self-contained toggle: checks API state, adds/removes, rolls back on error */}
                  <div className="absolute top-2 right-2">
                    <FavoriteButton eventId={event.id} size="sm" />
                  </div>
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
                        onClick={() => navigate(`/purchase/${event.eventKey || event.id}`)}
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
