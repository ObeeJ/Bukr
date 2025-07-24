import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Plus, Calendar, MapPin, Users, DollarSign, QrCode } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';
import EmptyState from '@/components/EmptyState';
import { Event } from '@/types';

const Events = () => {
  const { user } = useAuth();
  const { events } = useEvent();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const isOrganizer = user?.userType === 'organizer';

  useEffect(() => {
    setTimeout(() => setLoading(false), 300);
  }, []);

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date} ${event.time}`);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(eventDate.getTime() + 4 * 60 * 60 * 1000);
    
    return {
      isActive: now < endDate && event.status === 'active',
      isPast: now > endDate
    };
  };

  if (!isOrganizer) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">This page is only available for event organizers.</p>
          <Button onClick={() => navigate('/app')} className="w-full sm:w-auto">
            Explore Events
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20 sm:pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <AnimatedLogo size="sm" />
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">My Events</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your events and track performance
          </p>
        </div>
        <Button 
          variant="glow" 
          onClick={() => navigate('/create-event')}
          className="logo font-medium w-full sm:w-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No Events Created"
          description="You haven't created any events yet. Create your first event to start selling tickets!"
          icon="🎫"
          action={{
            label: "Create Event",
            onClick: () => navigate('/create-event')
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {events.map((event) => {
            const { isActive, isPast } = getEventStatus(event);
            return (
              <Card key={event.id} className="glass-card hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">
                        {event.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate leading-tight">
                          {event.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs sm:text-sm mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`text-xs px-2 py-1 ${
                      isActive ? 'bg-green-100 text-green-800 border-green-200' : 
                      isPast ? 'bg-gray-100 text-gray-800 border-gray-200' :
                      'bg-amber-100 text-amber-800 border-amber-200'
                    }`}>
                      {isActive ? 'Active' : isPast ? 'Ended' : 'Upcoming'}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Date & Time</div>
                      <div className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">{event.date}</span>
                      </div>
                      <div className="text-muted-foreground text-xs">{event.time}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Revenue</div>
                      <div className="flex items-center gap-1 font-medium">
                        <DollarSign className="w-3 h-3" />
                        <span>{event.revenue || '$0'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm text-muted-foreground">Tickets Sold</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {event.soldTickets || 0} / {event.totalTickets || 0}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(((event.soldTickets || 0) / (event.totalTickets || 1)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <div className="grid grid-cols-3 gap-2 w-full">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs min-h-[36px]"
                      onClick={() => navigate(`/events/${event.id}`)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs min-h-[36px]"
                      onClick={() => navigate(`/create-event/${event.id}`)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs min-h-[36px]"
                      onClick={() => navigate(`/scan/${event.id}`)}
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      Scan
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Events;