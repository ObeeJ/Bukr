import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Edit, Users, ChevronRight, Calendar, MapPin, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/contexts/EventContext";
import { Link, useNavigate } from "react-router-dom";
import AnimatedLogo from "@/components/AnimatedLogo";
import EmptyState from "@/components/EmptyState";
import { Event } from "@/types";

const MyEvents = () => {
  const { user } = useAuth();
  const { events } = useEvent();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const isOrganizer = user?.userType === 'organizer';

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  // Filter events for organizer or get user tickets
  const userEvents = isOrganizer ? events : [];

  // Calculate if event is active
  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(`${event.date} ${event.time}`);
    const endDate = event.endDate ? new Date(event.endDate) : new Date(eventDate.getTime() + 4 * 60 * 60 * 1000); // Default 4 hours
    
    return {
      isActive: now < endDate && event.status === 'active',
      isPast: now > endDate
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!isOrganizer) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-8">This page is only available for event organizers.</p>
          <Button onClick={() => navigate('/app')}>Explore Events</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <AnimatedLogo size="sm" />
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Events</h1>
          <p className="text-muted-foreground">Manage your events and track performance</p>
        </div>
        <Button 
          variant="glow" 
          onClick={() => navigate('/create-event')}
          className="logo font-medium w-full sm:w-auto"
        >
          Create New Event
        </Button>
      </div>

      {userEvents.length === 0 ? (
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
        <div className="space-y-4 sm:space-y-6">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-border/30">
                    <tr>
                      <th className="text-left p-4 font-medium">Event</th>
                      <th className="text-left p-4 font-medium">Date & Time</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Tickets</th>
                      <th className="text-left p-4 font-medium">Revenue</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEvents.map((event) => {
                      const { isActive, isPast } = getEventStatus(event);
                      return (
                        <tr key={event.id} className="border-b border-border/20 hover:bg-primary/5">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xl">
                                {event.emoji}
                              </div>
                              <div>
                                <div className="font-medium">{event.title}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-4 h-4" />
                              <span>{event.date}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">{event.time}</div>
                          </td>
                          <td className="p-4">
                            <Badge className={
                              isActive ? 'bg-green-100 text-green-800 border-green-200' : 
                              isPast ? 'bg-gray-100 text-gray-800 border-gray-200' :
                              'bg-amber-100 text-amber-800 border-amber-200'
                            }>
                              {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="text-sm">
                              <span className="font-medium">{event.soldTickets || 0}</span>
                              <span className="text-muted-foreground">/{event.totalTickets || 0}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1 text-sm font-medium">
                              <DollarSign className="w-3 h-3" />
                              {event.revenue || '$0'}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/events/${event.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/create-event/${event.id}`)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden space-y-4">
            {userEvents.map((event) => {
              const { isActive, isPast } = getEventStatus(event);
              return (
                <Card key={event.id} className="glass-card">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xl flex-shrink-0">
                          {event.emoji}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg truncate">{event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={
                        isActive ? 'bg-green-100 text-green-800 border-green-200' : 
                        isPast ? 'bg-gray-100 text-gray-800 border-gray-200' :
                        'bg-amber-100 text-amber-800 border-amber-200'
                      }>
                        {isActive ? 'Active' : isPast ? 'Completed' : 'Upcoming'}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Date & Time</div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <Calendar className="w-4 h-4" />
                          {event.date}
                        </div>
                        <div className="text-sm text-muted-foreground">{event.time}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Revenue</div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <DollarSign className="w-4 h-4" />
                          {event.revenue || '$0'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <div className="text-sm text-muted-foreground mb-1">Tickets Sold</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {event.soldTickets || 0} / {event.totalTickets || 0}
                        </span>
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ 
                              width: `${((event.soldTickets || 0) / (event.totalTickets || 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0">
                    <div className="flex gap-2 w-full">
                      <Button 
                        variant="outline" 
                        className="flex-1 logo font-medium"
                        onClick={() => navigate(`/events/${event.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 logo font-medium"
                        onClick={() => navigate(`/create-event/${event.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyEvents;