import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { useTicket } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { Event, PromoCode, Ticket } from '@/types';
import { getEventAnalytics } from '@/api/analytics';
import PublicEventView from '@/components/events/PublicEventView';
import OrganizerEventView from '@/components/events/OrganizerEventView';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEvent, getPromos } = useEvent();
  const { getEventTickets } = useTicket();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [metrics, setMetrics] = useState({
    totalTickets: 0,
    soldTickets: 0,
    remainingTickets: 0,
    usedTickets: 0,
    promoUses: 0,
    collabSales: 0,
    revenue: 0,
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const eventData = await getEvent(id);
      setEvent(eventData);

      if (eventData && user?.userType === 'organizer') {
        // Fetch organizer-specific data in parallel
        const [promosData, ticketsData] = await Promise.all([
          getPromos(id).catch(() => [] as PromoCode[]),
          getEventTickets(id).catch(() => [] as Ticket[]),
        ]);
        setPromos(promosData);

        // Try to fetch analytics from the API
        try {
          const analytics = await getEventAnalytics(id);
          setMetrics({
            totalTickets: analytics.totalTickets || eventData.totalTickets || 0,
            soldTickets: analytics.soldTickets || eventData.soldTickets || 0,
            remainingTickets: (analytics.totalTickets || 0) - (analytics.soldTickets || 0),
            usedTickets: analytics.usedTickets || 0,
            promoUses: promosData.reduce((sum, p) => sum + p.usedCount, 0),
            collabSales: 0,
            revenue: analytics.revenue || 0,
          });
        } catch {
          // Fallback to local calculation
          const totalTickets = eventData.totalTickets || 0;
          const soldTickets = ticketsData.length || eventData.soldTickets || 0;
          setMetrics({
            totalTickets,
            soldTickets,
            remainingTickets: totalTickets - soldTickets,
            usedTickets: ticketsData.filter(t => t.status === 'used').length,
            promoUses: promosData.reduce((sum, p) => sum + p.usedCount, 0),
            collabSales: 0,
            revenue: typeof eventData.revenue === 'number' ? eventData.revenue : 0,
          });
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id, user?.userType]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Event not found</h1>
        <Button onClick={() => navigate('/events')} variant="ghost">
          Back to Events
        </Button>
      </div>
    );
  }

  const now = new Date();
  const eventDate = new Date(`${event.date} ${event.time}`);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
  const isActive = now < endDate && event.status === 'active';

  const isOwner = user?.userType === 'organizer';

  if (isOwner) {
    return <OrganizerEventView event={event} metrics={metrics} promos={promos} isActive={isActive} />;
  }

  return <PublicEventView event={event} />;
};

export default EventDetail;
