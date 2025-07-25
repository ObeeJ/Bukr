import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEvent } from '@/contexts/EventContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, BarChart, Settings, QrCode, Users, Tag, ChevronRight, Edit, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedLogo from '@/components/AnimatedLogo';
import EventCollaborators from '@/components/EventCollaborators';
import PromoCodeManager from '@/components/PromoCodeManager';
import TicketScanner from '@/components/TicketScanner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

const EventDashboard = () => {
  const { user } = useAuth();
  const { events } = useEvent();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { eventId } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEvent, setSelectedEvent] = useState(eventId ? events.find(e => e.id === eventId) : events[0]);
  const [eventSelectorOpen, setEventSelectorOpen] = useState(false);

  const handleEditEvent = (eventId: string) => {
    navigate(`/create-event/${eventId}`);
  };

  const handleManageEvent = (eventId: string) => {
    setSelectedEvent(events.find(e => e.id === eventId));
    setEventSelectorOpen(false);
  };

  if (!user || user.userType !== 'organizer') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">This page is only available for event organizers.</p>
          <Button onClick={() => navigate('/app')} className="w-full sm:w-auto min-h-[44px]">
            Explore Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20 sm:pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Event Dashboard</h1>
          <Button 
            variant="outline" 
            className="flex items-center gap-2 mt-2 min-h-[44px]"
            onClick={() => setEventSelectorOpen(true)}
          >
            {selectedEvent?.title || "Select Event"} <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button 
          variant="glow" 
          className="mt-4 md:mt-0 flex items-center gap-2 logo font-medium min-h-[44px] w-full sm:w-auto"
          onClick={() => navigate('/create-event')}
        >
          Create New Event
        </Button>
      </div>

      {selectedEvent ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Total Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-primary logo">{selectedEvent.totalTickets || 0}</div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Tickets Sold</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-primary logo">{selectedEvent.soldTickets || 0}</div>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${((selectedEvent.soldTickets || 0) / (selectedEvent.totalTickets || 1)) * 100}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-primary logo">{selectedEvent.revenue || '$0'}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8">
              <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 logo font-medium text-xs sm:text-sm">
                <BarChart className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="scan" className="flex items-center gap-1 sm:gap-2 logo font-medium text-xs sm:text-sm">
                <QrCode className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Scan</span>
              </TabsTrigger>
              <TabsTrigger value="collaborators" className="flex items-center gap-1 sm:gap-2 logo font-medium text-xs sm:text-sm">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Collabs</span>
              </TabsTrigger>
              <TabsTrigger value="promo" className="flex items-center gap-1 sm:gap-2 logo font-medium text-xs sm:text-sm">
                <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Promos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 sm:space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Event Details</CardTitle>
                  <CardDescription>Overview of your event</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="logo font-medium min-h-[44px] w-full sm:w-auto"
                    onClick={() => handleEditEvent(selectedEvent.id.toString())}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Event
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="scan" className="space-y-4">
              <TicketScanner onScan={(code) => {
                toast({
                  title: "Ticket Scanned",
                  description: `Scanned: ${code}`
                });
              }} />
            </TabsContent>

            <TabsContent value="collaborators" className="space-y-4">
              <EventCollaborators 
                eventId={selectedEvent.id.toString()} 
                eventName={selectedEvent.title} 
                totalTickets={selectedEvent.totalTickets || 0} 
              />
            </TabsContent>

            <TabsContent value="promo" className="space-y-4">
              <PromoCodeManager 
                eventId={selectedEvent.id.toString()} 
                eventName={selectedEvent.title} 
              />
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-16">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">No Events Found</h2>
          <p className="text-muted-foreground mb-8">Create your first event to get started</p>
          <Button 
            variant="glow" 
            onClick={() => navigate('/create-event')}
            className="logo font-medium min-h-[44px] w-full sm:w-auto"
          >
            Create Event
          </Button>
        </div>
      )}

      {/* Event Selector Dialog */}
      <Dialog open={eventSelectorOpen} onOpenChange={setEventSelectorOpen}>
        <DialogContent className="glass-card border-glass-border max-w-3xl mx-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold">Select Event</h2>
            <div className="overflow-x-auto">
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
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="min-h-[36px]"
                            onClick={() => handleManageEvent(event.id.toString())}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Manage
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="min-h-[36px]"
                            onClick={() => handleEditEvent(event.id.toString())}
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventDashboard;