// src/pages/UserDashboard.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/contexts/EventContext";
import { useTicket } from "@/contexts/TicketContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Ticket, Heart, User, ArrowLeft } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";
import EmptyState from "@/components/EmptyState";
import { Event, Ticket } from "@/types";

const UserDashboard = () => {
  const { user } = useAuth();
  const { events, fetchEvents, loading: eventsLoading, error: eventsError } = useEvent();
  const { getUserTickets, loading: ticketsLoading, error: ticketsError } = useTicket();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [favorites, setFavorites] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    if (user?.email) {
      fetchEvents();
      const userTickets = getUserTickets(user.email);
      setTickets(userTickets || []);
      // Mock favorites - replace with actual user favorites from context or API
      setFavorites(events.filter((event) => user.favorites?.includes(event.id)));
    }
  }, [user, fetchEvents, getUserTickets, events]);

  if (!user) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold watermark mb-4">Please Sign In</h2>
          <p className="text-muted-foreground font-montserrat mb-8">
            You need to be signed in to view your dashboard.
          </p>
          <Button
            variant="glow"
            onClick={() => navigate("/login")}
            className="logo font-medium hover-glow"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (eventsLoading || ticketsLoading) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (eventsError || ticketsError) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold watermark mb-4">Error Loading Dashboard</h2>
          <p className="text-muted-foreground font-montserrat mb-8">
            {eventsError || ticketsError}
          </p>
          <Button
            variant="glow"
            onClick={() => navigate("/app")}
            className="logo font-medium hover-glow"
          >
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const upcomingEvents = tickets
    .map((ticket) => {
      const event = events.find((e) => e.id.toString() === ticket.eventId);
      return event ? { ...event, ticket } : null;
    })
    .filter((e): e is Event & { ticket: Ticket } => e !== null)
    .filter((e) => new Date(e.date) >= new Date());

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/app")}
          className="p-2 hover-glow"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline logo font-medium">Back</span>
        </Button>
        <AnimatedLogo size="sm" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold watermark mb-2">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground font-montserrat">Manage your events and tickets</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-glass/20 rounded-[var(--radius)]">
          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <Calendar className="w-4施
System: The code appears to be cut off. Here's the continuation and improvement of the `UserDashboard` component, incorporating best practices, error handling, and modern React patterns:

```tsx
// src/pages/UserDashboard.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/contexts/EventContext";
import { useTicket } from "@/contexts/TicketContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Ticket, Heart, User, ArrowLeft } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";
import EmptyState from "@/components/EmptyState";
import { Event, Ticket } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const UserDashboard = () => {
  const { user } = useAuth();
  const { events, fetchEvents, loading: eventsLoading, error: eventsError } = useEvent();
  const { getUserTickets, loading: ticketsLoading, error: ticketsError } = useTicket();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [favorites, setFavorites] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    if (user?.email) {
      const loadData = async () => {
        try {
          await fetchEvents();
          const userTickets = await getUserTickets(user.email);
          setTickets(userTickets || []);
          setFavorites(events.filter((event) => user.favorites?.includes(event.id)));
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to load dashboard data. Please try again.",
            variant: "destructive",
          });
        }
      };
      loadData();
    }
  }, [user, fetchEvents, getUserTickets, events, toast]);

  const handleViewDetails = (eventKey: string) => {
    navigate(`/events/${eventKey}`);
  };

  const handleViewTicket = (ticket: Ticket) => {
    navigate(`/tickets/${ticket.ticketId}`);
  };

  const handleBookNow = (eventKey: string) => {
    navigate(`/events/${eventKey}/purchase`);
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold watermark mb-4">Please Sign In</h2>
          <p className="text-muted-foreground font-montserrat mb-8">
            You need to be signed in to view your dashboard.
          </p>
          <Button
            variant="glow"
            onClick={() => navigate("/login")}
            className="logo font-medium hover-glow"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (eventsLoading || ticketsLoading) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (eventsError || ticketsError) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold watermark mb-4">Error Loading Dashboard</h2>
          <p className="text-muted-foreground font-montserrat mb-8">
            {eventsError || ticketsError}
          </p>
          <Button
            variant="glow"
            onClick={() => navigate("/app")}
            className="logo font-medium hover-glow"
          >
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  const upcomingEvents = tickets
    .map((ticket) => {
      const event = events.find((e) => e.id.toString() === ticket.eventId);
      return event ? { ...event, ticket } : null;
    })
    .filter((e): e is Event & { ticket: Ticket } => e !== null)
    .filter((e) => new Date(e.date) >= new Date());

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/app")}
          className="p-2 hover-glow"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline logo font-medium">Back</span>
        </Button>
        <AnimatedLogo size="sm" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold watermark mb-2">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground font-montserrat">Manage your events and tickets</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-glass/20 rounded-[var(--radius)]">
          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Upcoming</span>
          </TabsTrigger>
          <TabsTrigger
            value="tickets"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <Ticket className="w-4 h-4" />
            <span className="hidden sm:inline">My Tickets</span>
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Favorites</span>
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="glass-card hover-glow">
                  <CardHeader>
                    <CardTitle className="truncate logo">{event.title}</CardTitle>
                    <CardDescription className="font-montserrat">
                      {new Date(event.date).toLocaleDateString()} • {event.time}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                      <span className="text-6xl">{event.emoji || "🎉"}</span>
                    </div>
                    <p className="text-sm text-muted-foreground font-montserrat">
                      Your tickets: {event.ticket.quantity} × {event.ticket.ticketType}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 logo font-medium hover-glow"
                      onClick={() => handleViewDetails(event.key || "")}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="glow"
                      className="flex-1 logo font-medium hover-glow"
                      onClick={() => handleViewTicket(event.ticket)}
                    >
                      View Tickets
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Upcoming Events"
              description="You don't have any upcoming events. Explore new events to attend!"
              icon="📅"
              action={{
                label: "Explore Events",
                onClick: () => navigate("/app"),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          {tickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tickets.map((ticket) => {
                const event = events.find((e) => e.id.toString() === ticket.eventId);
                return (
                  <Card key={ticket.ticketId} className="glass-card hover-glow">
                    <CardHeader>
                      <CardTitle className="truncate logo">{event?.title || "Unknown Event"}</CardTitle>
                      <CardDescription className="font-montserrat">
                        {event ? `${new Date(event.date).toLocaleDateString()} • ${event.time}` : "N/A"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                        <span className="text-6xl">{event?.emoji || "🎉"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-montserrat">
                        Your tickets: {ticket.quantity} × {ticket.ticketType}
                      </p>
                    </CardContent>
                    <CardFooter className="flex justify-between gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 logo font-medium hover-glow"
                        onClick={() => handleViewDetails(event?.key || "")}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="glow"
                        className="flex-1 logo font-medium hover-glow"
                        onClick={() => handleViewTicket(ticket)}
                      >
                        View Ticket
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No Tickets Found"
              description="You haven't purchased any tickets yet. Explore events and book your first ticket!"
              icon="🎫"
              action={{
                label: "Explore Events",
                onClick: () => navigate("/app"),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((event) => (
                <Card key={event.id} className="glass-card hover-glow">
                  <CardHeader>
                    <CardTitle className="truncate logo">{event.title}</CardTitle>
                    <CardDescription className="font-montserrat">
                      {new Date(event.date).toLocaleDateString()} • {event.time}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                      <span className="text-6xl">{event.emoji || "🎉"}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 logo font-medium hover-glow"
                      onClick={() => handleViewDetails(event.key || "")}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="glow"
                      className="flex-1 logo font-medium hover-glow"
                      onClick={() => handleBookNow(event.key || "")}
                    >
                      Book Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Favorites"
              description="You haven't favorited any events yet. Find events you love and save them!"
              icon="❤️"
              action={{
                label: "Explore Events",
                onClick: () => navigate("/app"),
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card className="glass-card hover-glow">
            <CardHeader>
              <CardTitle className="logo">Personal Information</CardTitle>
              <CardDescription className="font-montserrat">Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-montserrat">Name</p>
                  <p className="font-medium logo">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-montserrat">Email</p>
                  <p className="font-medium logo">{user.email}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="logo font-medium hover-glow"
                onClick={() => navigate("/profile")}
              >
                Edit Profile
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDashboard;