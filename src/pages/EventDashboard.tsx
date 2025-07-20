import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart, Settings, QrCode, Users, Tag, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedLogo from '@/components/AnimatedLogo';
import EventCollaborators from '@/components/EventCollaborators';
import PromoCodeManager from '@/components/PromoCodeManager';
import TicketScanner from '@/components/TicketScanner';

const EventDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock event data - in a real app, this would be fetched from an API
  const event = {
    id: "101",
    title: "Tech Conference 2023",
    location: "Convention Center, SF",
    date: "8/20/2023",
    time: "9:00 AM",
    totalTickets: 1000,
    soldTickets: 850,
    revenue: "$127,500",
    status: "active",
    image: "💻"
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Event Dashboard</h1>
          <p className="text-muted-foreground">{event.title}</p>
        </div>
        <Button 
          variant="glow" 
          className="mt-4 md:mt-0 flex items-center gap-2 logo font-medium"
          onClick={() => navigate('/create-event')}
        >
          Create New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{event.totalTickets}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Tickets Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{event.soldTickets}</div>
            <div className="w-full bg-muted rounded-full h-2 mt-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ width: `${(event.soldTickets / event.totalTickets) * 100}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{event.revenue}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="overview" className="flex items-center gap-2 logo font-medium">
            <BarChart className="w-4 h-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="scan" className="flex items-center gap-2 logo font-medium">
            <QrCode className="w-4 h-4" />
            <span>Scan Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="flex items-center gap-2 logo font-medium">
            <Users className="w-4 h-4" />
            <span>Collaborators</span>
          </TabsTrigger>
          <TabsTrigger value="promo" className="flex items-center gap-2 logo font-medium">
            <Tag className="w-4 h-4" />
            <span>Promo Codes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
              <CardDescription>Overview of your event</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Event Name</p>
                  <p className="font-medium">{event.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{event.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{event.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{event.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{event.status}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="logo font-medium">Edit Event</Button>
            </CardFooter>
          </Card>
          
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
              <CardDescription>Ticket sales and revenue</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <p className="text-muted-foreground">Sales charts will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <TicketScanner />
        </TabsContent>

        <TabsContent value="collaborators" className="space-y-4">
          <EventCollaborators 
            eventId={event.id} 
            eventName={event.title} 
            totalTickets={event.totalTickets} 
          />
        </TabsContent>

        <TabsContent value="promo" className="space-y-4">
          <PromoCodeManager 
            eventId={event.id} 
            eventName={event.title} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EventDashboard;