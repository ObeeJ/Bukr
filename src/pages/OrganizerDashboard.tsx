// src/pages/OrganizerDashboard.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent } from "@/contexts/EventContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, BarChart, Settings, Plus, Users, Edit, TrendingUp, Ticket, DollarSign, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AnimatedLogo from "@/components/AnimatedLogo";
import EmptyState from "@/components/EmptyState";
import TicketScanner from "@/components/TicketScanner";
import { Event } from "@/types";
import { getEventAnalytics } from "@/api/analytics";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// ─── Analytics Tab ────────────────────────────────────────────────────────────
// Fetches real analytics for each event and renders Recharts visualizations.
// Wired to GET /analytics/events/:id — no more placeholder text.

interface EventAnalyticsData {
  title: string;
  sold: number;
  scanned: number;
  available: number;
  revenue: number;
  currency: string;
}

const AnalyticsTab = ({ events }: { events: Event[] }) => {
  const { toast } = useToast();
  const [data, setData] = useState<EventAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!events.length) { setLoading(false); return; }

    Promise.all(
      events.map(async (e) => {
        try {
          const a = await getEventAnalytics(e.id);
          return {
            title: e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title,
            sold: a.soldTickets,
            scanned: a.usedTickets,
            available: a.totalTickets - a.soldTickets,
            revenue: Number(a.revenue) || 0,
            currency: a.currency || 'USD',
          } as EventAnalyticsData;
        } catch {
          return null;
        }
      })
    ).then(results => {
      setData(results.filter(Boolean) as EventAnalyticsData[]);
      setLoading(false);
    });
  }, [events]);

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalSold = data.reduce((s, d) => s + d.sold, 0);
  const totalScanned = data.reduce((s, d) => s + d.scanned, 0);
  const currency = data[0]?.currency || 'USD';
  const currencySymbol = currency === 'NGN' ? '₦' : '$';

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  if (!data.length) {
    return (
      <Card className="glass-card">
        <CardContent className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground font-montserrat">No analytics data yet. Create events and sell tickets to see insights.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card hover-glow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{currencySymbol}{totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-card hover-glow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalSold.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="glass-card hover-glow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalSold > 0 ? Math.round((totalScanned / totalSold) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets sold per event */}
      <Card className="glass-card hover-glow">
        <CardHeader>
          <CardTitle className="font-medium">Tickets Sold per Event</CardTitle>
          <CardDescription className="font-montserrat">Sold vs scanned (attended)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <ReBarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="title" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="sold" name="Sold" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              <Bar dataKey="scanned" name="Attended" fill="hsl(var(--primary) / 0.4)" radius={[4,4,0,0]} />
            </ReBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue per event */}
      <Card className="glass-card hover-glow">
        <CardHeader>
          <CardTitle className="font-medium">Revenue per Event</CardTitle>
          <CardDescription className="font-montserrat">Total revenue ({currency})</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="title" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8 }}
                formatter={(v: number) => [`${currencySymbol}${v.toLocaleString()}`, 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const { events, fetchMyEvents, loading, error } = useEvent();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("events");
  const [selectedScanEvent, setSelectedScanEvent] = useState('');

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
    const revenue = typeof event.revenue === 'number' ? event.revenue : Number.parseFloat(String(event.revenue || 0));
    return sum + (Number.isNaN(revenue) ? 0 : revenue);
  }, 0);
  const currency = events[0]?.currency === 'NGN' ? '₦' : '$';

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
            <div className="text-3xl font-bold text-primary">{currency}{totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-glass/20 rounded-[var(--radius)]">
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
            value="scanner"
            className="flex items-center gap-2 logo font-medium data-[state=active]:bg-primary/20"
          >
            <QrCode className="w-4 h-4" />
            Scanner
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
          <AnalyticsTab events={events} />
        </TabsContent>

        <TabsContent value="scanner" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-medium">Scan Tickets</CardTitle>
              <CardDescription className="font-montserrat">
                Select an event to start scanning as organizer. No access code needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedScanEvent}
                onChange={e => setSelectedScanEvent(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-6"
              >
                <option value="">Select an event to scan...</option>
                {events.map(e => (
                  <option key={e.id} value={e.eventKey || e.id}>{e.title}</option>
                ))}
              </select>
              {selectedScanEvent && (
                <TicketScanner eventKey={selectedScanEvent} />
              )}
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