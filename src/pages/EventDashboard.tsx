import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart, Settings, QrCode, Users, Tag, ChevronRight, Edit, Eye, PieChart } from 'lucide-react';
import EventStats from '@/components/EventStats';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedLogo from '@/components/AnimatedLogo';
import EventCollaborators from '@/components/EventCollaborators';
import PromoCodeManager from '@/components/PromoCodeManager';
import TicketScanner from '@/components/TicketScanner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

// Import chart components
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const EventDashboard = () => {
  const { user } = useAuth();
  const { events } = useEvent();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { eventId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEvent, setSelectedEvent] = useState(eventId ? events.find(e => e.id === eventId) : events[0]);
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);

  // Chart data
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Tickets Sold',
        data: [12, 19, 3, 5, 2, 3],
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Revenue',
        data: [32, 29, 13, 25, 12, 13],
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Sales Overview',
      },
    },
  };

  const handleEditEvent = (eventId: string) => {
    navigate(`/create-event/${eventId}`);
  };

  const handleManageEvent = (eventId: string) => {
    setSelectedEvent(events.find(e => e.id === eventId));
    setEventSelectorOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Event Dashboard</h1>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 mt-2"
            onClick={() => setEventSelectorOpen(true)}
          >
            {selectedEvent?.title || "Select Event"} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button 
          variant="glow" 
          className="mt-4 md:mt-0 flex items-center gap-2 logo font-medium"
          onClick={() => navigate('/create-event')}
        >
          Create New Event
        </Button>
      </div>

      {selectedEvent ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{selectedEvent.totalTickets}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tickets Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{selectedEvent.soldTickets}</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${(selectedEvent.soldTickets / selectedEvent.totalTickets) * 100}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{selectedEvent.revenue}</div>
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
                      <p className="font-medium">{selectedEvent.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedEvent.location}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedEvent.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">{selectedEvent.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium capitalize">{selectedEvent.status}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">{selectedEvent.price}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="logo font-medium"
                    onClick={() => handleEditEvent(selectedEvent.id)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Event
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Sales Overview</CardTitle>
                  <CardDescription>Ticket sales and revenue</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <Bar data={chartData} options={chartOptions} />
                </CardContent>
              </Card>
              
              <EventStats 
                eventId={selectedEvent.id} 
                eventKey={selectedEvent.key || ''} 
                totalTickets={selectedEvent.totalTickets} 
              />
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              <TicketScanner />
            </TabsContent>

            <TabsContent value="collaborators" className="space-y-4">
              <EventCollaborators 
                eventId={selectedEvent.id} 
                eventName={selectedEvent.title} 
                totalTickets={selectedEvent.totalTickets} 
              />
            </TabsContent>

            <TabsContent value="promo" className="space-y-4">
              <PromoCodeManager 
                eventId={selectedEvent.id} 
                eventName={selectedEvent.title} 
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-4">No Events Found</h2>
          <p className="text-muted-foreground mb-8">Create your first event to get started</p>
          <Button 
            variant="glow" 
            onClick={() => navigate('/create-event')}
            className="logo font-medium"
          >
            Create Event
          </Button>
        </div>
      )}

      {/* Event Selector Dialog */}
      <Dialog open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
        <DialogContent className="glass-card border-glass-border max-w-3xl mx-4">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Select Event</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell>
                      <Badge className={
                        event.status === 'active' ? 'bg-green-500' : 
                        event.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                      }>
                        {event.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleManageEvent(event.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditEvent(event.id)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDashboard;