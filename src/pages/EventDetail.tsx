import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { useTicket } from '@/contexts/TicketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, Users, Tag, BarChart3, Calendar, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import AnimatedLogo from '@/components/AnimatedLogo';

import { Event } from '@/types';



const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEvent, getPromos } = useEvent();
  const { getEventTickets } = useTicket();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalTickets: 0,
    soldTickets: 0,
    remainingTickets: 0,
    usedTickets: 0,
    promoUses: 0,
    collabSales: 0,
    revenue: 0
  });
  
  const event = getEvent(id || '') as Event;
  const promos = getPromos(id || '');
  const tickets = getEventTickets(id || '');
  
  useEffect(() => {
    if (event && !Array.isArray(event)) {
      // Simulate API call
      setTimeout(() => {
        const totalTickets = event.totalTickets || 0;
        const soldTickets = tickets.length;
        const remainingTickets = totalTickets - soldTickets;
        const usedTickets = tickets.filter(t => t.status === 'used').length;
        const promoUses = promos.reduce((sum, p) => sum + p.usedCount, 0);
        const collabSales = Math.floor(soldTickets * 0.3); // 30% from collaborators
        const revenue = parseFloat((event.revenue || '$0').replace('$', '').replace(',', '')) || 0;
        
        setMetrics({
          totalTickets,
          soldTickets,
          remainingTickets,
          usedTickets,
          promoUses,
          collabSales,
          revenue
        });
        setLoading(false);
      }, 800);
    } else {
      setLoading(false);
    }
  }, [event, tickets, promos]);
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!event || Array.isArray(event)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Calculate if event is active
  const now = new Date();
  const eventDate = new Date(`${event.date} ${event.time}`);
  const endDate = event.endDate ? new Date(event.endDate) : new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
  const isActive = now < endDate && event.status === 'active';



  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <Button variant="ghost" onClick={() => navigate('/events')} className="p-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back</span>
        </Button>
        <AnimatedLogo size="sm" />
      </div>

      {/* Event Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">{event.title}</h1>
            <Badge className={isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="space-y-1 text-sm sm:text-base text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{event.date} • {event.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate(`/create-event/${event.id}`)}
          className="flex items-center gap-2 w-full sm:w-auto"
        >
          <Edit className="w-4 h-4" />
          Edit Event
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold logo">{metrics.totalTickets}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-blue-600 logo">{metrics.soldTickets}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-green-600 logo">{metrics.usedTickets}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-primary flex items-center gap-1 logo">
              <DollarSign className="w-4 h-4" />
              {event.revenue || '$0'}
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Promo Codes Summary */}
      {promos.length > 0 && (
        <Card className="glass-card mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Tag className="w-5 h-5" />
              Promo Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {promos.map(promo => (
                <div key={promo.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-primary/10 rounded-lg gap-2">
                  <div>
                    <span className="font-medium">{promo.code}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {promo.discountPercentage}% off
                    </span>
                  </div>
                  <div className="text-sm">
                    {promo.usedCount}/{promo.ticketLimit} used
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Collaborator Performance */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Users className="w-5 h-5" />
            Collaborator Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-primary/10 rounded-lg gap-2">
              <div>
                <div className="font-medium">Direct Sales</div>
                <div className="text-sm text-muted-foreground">Organizer sales</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{metrics.soldTickets - metrics.collabSales}</div>
                <div className="text-sm text-muted-foreground">tickets</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-primary/10 rounded-lg gap-2">
              <div>
                <div className="font-medium">Collaborator Sales</div>
                <div className="text-sm text-muted-foreground">Via shared links</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{metrics.collabSales}</div>
                <div className="text-sm text-muted-foreground">tickets</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventDetail;