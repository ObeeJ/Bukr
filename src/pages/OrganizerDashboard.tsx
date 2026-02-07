// src/pages/OrganizerDashboard.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/contexts/EventContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart, Settings, Plus, Users, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedLogo from "@/components/AnimatedLogo";
import EmptyState from "@/components/EmptyState";
import { Event } from "@/types";

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const { events, fetchMyEvents, loading, error } = useEvent();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("events");

  useEffect(() => {
    if (user?.userType === "organizer") {
      fetchMyEvents();
    }
  }, [fetchMyEvents, user]);

  if (user?.userType !== "organizer") {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4 watermark">Access Denied</h2>
          <p className="text-muted-foreground font-montserrat mb-8">
            This page is only available for event organizers.
          </p>
          <Button variant="glow" onClick={() => navigate("/app")} className="logo font-medium">
            Explore Events
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
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

  if (error) {
    return (
      <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
        <div className="flex items-center gap-2 mb-6">
          <AnimatedLogo size="sm" />
        </div>
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4 watermark">Error Loading Dashboard</h2>
          <p className="text-muted-foreground font-montserrat mb-8">{error}</p>
          <Button variant="glow" onClick={() => fetchMyEvents()} className="logo font-medium">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalTicketsSold = events.reduce((sum, event) => sum + (event.soldTickets || 0), 0);
  const totalRevenue = events.reduce((sum, event) => {
    const revenue = typeof event.revenue === 'number' ? event.revenue : parseFloat(String(event.revenue || 0));
    return sum + (isNaN(revenue) ? 0 : revenue);
  }, 0);

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2 watermark">Organizer Dashboard</h1>
          <p className="text-muted-foreground font-montserrat">{user?.orgName || user?.name}</p>
        </div>
        <Button
          variant="glow"
          className="flex items-center gap-2 logo font-medium shadow-md hover-glow"
          onClick={() => navigate("/create-event")}
        >
          <Plus className="w-4 h-4" />
          Create New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card hover-glow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{events.length}</div>
          </CardContent>
        </Card>
        <Card className="glass-card hover-glow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Tickets Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{totalTicketsSold}</div>
          </CardContent>
        </Card>
        <Card className="glass-card hover-glow">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-glass/20 rounded-[var(--radius)]">
          <TabsTrigger
            value="events"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <Calendar className="w-4 h-4" />
            Events
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <BarChart className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          {events.length === 0 ? (
            <EmptyState
              title="No Events Created"
              description="You haven't created any events yet. Create your first event to start selling tickets!"
              icon="🎫"
              action={{
                label: "Create Event",
                onClick: () => navigate("/create-event"),
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="glass-card hover-glow">
                  <CardHeader>
                    <CardTitle className="truncate">{event.title}</CardTitle>
                    <CardDescription>
                      {new Date(event.date).toLocaleDateString()} • {event.time}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                      <span className="text-6xl">{event.emoji || "🎉"}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground font-montserrat">
                        <span className="font-medium">Location:</span> {event.location}
                      </p>
                      <p className="text-sm text-muted-foreground font-montserrat">
                        <span className="font-medium">Tickets Sold:</span>{" "}
                        {event.soldTickets || 0}/{event.totalTickets || 0}
                      </p>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              ((event.soldTickets || 0) / (event.totalTickets || 1)) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 logo font-medium hover-glow"
                      onClick={() => navigate(`/create-event/${event.id}`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="glow"
                      className="flex-1 logo font-medium hover-glow"
                      onClick={() => navigate(`/events/${event.id}/attendees`)}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Attendees
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card className="glass-card hover-glow">
            <CardHeader>
              <CardTitle className="font-medium">Revenue Overview</CardTitle>
              <CardDescription className="font-montserrat">Last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground font-montserrat">
                Analytics charts will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="glass-card hover-glow">
            <CardHeader>
              <CardTitle className="font-medium">Organization Settings</CardTitle>
              <CardDescription className="font-montserrat">
                Manage your organization details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground font-montserrat">Organization Name</p>
                  <p className="font-medium">{user?.orgName || user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-montserrat">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="logo font-medium hover-glow"
                onClick={() => navigate("/settings/organization")}
              >
                Edit Organization
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrganizerDashboard;