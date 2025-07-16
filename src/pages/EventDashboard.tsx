import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Calendar, TrendingUp } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";

const EventDashboard = () => {
  const myEvents = [
    {
      id: "1",
      title: "Summer Music Festival",
      totalTickets: 1000,
      soldTickets: 750,
      revenue: 18750,
      date: "2025-07-15",
      status: "active"
    },
    {
      id: "2", 
      title: "Tech Conference 2025",
      totalTickets: 500,
      soldTickets: 320,
      revenue: 48000,
      date: "2025-08-20",
      status: "active"
    }
  ];

  const totalRevenue = myEvents.reduce((sum, event) => sum + event.revenue, 0);
  const totalSold = myEvents.reduce((sum, event) => sum + event.soldTickets, 0);
  const totalCapacity = myEvents.reduce((sum, event) => sum + event.totalTickets, 0);

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <AnimatedLogo size="md" clickable={true} />
            <h1 className="text-3xl font-bold text-glow mt-2">Event Dashboard</h1>
            <p className="text-muted-foreground">Monitor your events and ticket sales</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="glass-card border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">{totalSold}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">{totalCapacity}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-glass-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fill Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {Math.round((totalSold / totalCapacity) * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground">Your Events</h2>
          {myEvents.map((event) => (
            <Card key={event.id} className="glass-card border-glass-border hover-glow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-foreground">{event.title}</CardTitle>
                    <p className="text-muted-foreground">{event.date}</p>
                  </div>
                  <Badge className="status-badge status-confirmed">
                    {event.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tickets Sold</p>
                    <p className="text-lg font-bold text-foreground">
                      {event.soldTickets} / {event.totalTickets}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Available</p>
                    <p className="text-lg font-bold text-foreground">
                      {event.totalTickets - event.soldTickets}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold text-foreground">
                      ${event.revenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fill Rate</p>
                    <p className="text-lg font-bold text-foreground">
                      {Math.round((event.soldTickets / event.totalTickets) * 100)}%
                    </p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-muted/20 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(event.soldTickets / event.totalTickets) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;