import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket, Share2, QrCode, Download } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Tickets = () => {
  const { user } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);

  // Sample ticket data
  const tickets = [
    {
      id: 1,
      eventName: 'Summer Music Festival',
      date: 'July 15, 2023',
      time: '6:00 PM',
      location: 'Central Park, NY',
      ticketType: 'General Admission',
      price: '$50',
      quantity: 2,
      status: 'active',
      emoji: '🎵',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TICKET-12345-BUKR'
    },
    {
      id: 2,
      eventName: 'Tech Conference 2023',
      date: 'August 20, 2023',
      time: '9:00 AM',
      location: 'Convention Center, SF',
      ticketType: 'VIP Access',
      price: '$150',
      quantity: 1,
      status: 'active',
      emoji: '💻',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TICKET-67890-BUKR'
    },
    {
      id: 3,
      eventName: 'Comedy Night',
      date: 'June 10, 2023',
      time: '8:00 PM',
      location: 'Comedy Club, NYC',
      ticketType: 'Standard Entry',
      price: '$45',
      quantity: 2,
      status: 'used',
      emoji: '😂',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TICKET-54321-BUKR'
    }
  ];

  const openTicketDetails = (ticket: any) => {
    setSelectedTicket(ticket);
    setTicketDetailsOpen(true);
  };

  const shareTicket = (ticket: any) => {
    // In a real app, this would open a share dialog
    if (navigator.share) {
      navigator.share({
        title: `My ticket for ${ticket.eventName}`,
        text: `Check out my ticket for ${ticket.eventName} on ${ticket.date}!`,
        url: window.location.href,
      });
    } else {
      alert(`Sharing ticket for ${ticket.eventName}`);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">My Tickets</h1>
          <p className="text-muted-foreground">Access and manage your event tickets</p>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="active" className="logo font-medium">Active Tickets</TabsTrigger>
          <TabsTrigger value="past" className="logo font-medium">Past Events</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.filter(ticket => ticket.status === 'active').map((ticket) => (
              <Card key={ticket.id} className="glass-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium">{ticket.eventName}</CardTitle>
                      <CardDescription>{ticket.date} • {ticket.time}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {ticket.quantity} {ticket.quantity > 1 ? 'Tickets' : 'Ticket'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                    <span className="text-6xl">{ticket.emoji}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Location:</span> {ticket.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Type:</span> {ticket.ticketType}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => shareTicket(ticket)}>
                            <Share2 className="w-5 h-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Share ticket
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Button 
                    variant="glow" 
                    className="logo font-medium"
                    onClick={() => openTicketDetails(ticket)}
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    View Ticket
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.filter(ticket => ticket.status === 'used').map((ticket) => (
              <Card key={ticket.id} className="glass-card-expired">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-medium">{ticket.eventName}</CardTitle>
                      <CardDescription>{ticket.date} • {ticket.time}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-muted/10">
                      {ticket.quantity} {ticket.quantity > 1 ? 'Tickets' : 'Ticket'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-muted/20 to-muted/10 rounded-md flex items-center justify-center mb-4">
                    <span className="text-6xl">{ticket.emoji}</span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Location:</span> {ticket.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Type:</span> {ticket.ticketType}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" className="logo font-medium">
                    Event Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Ticket Details Dialog */}
      <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
        {selectedTicket && (
          <DialogContent className="glass-card border-glass-border max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-center">{selectedTicket.eventName}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-xl mb-4">
                  <img 
                    src={selectedTicket.qrCode} 
                    alt="Ticket QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <Badge className="mb-4 py-1 px-3">
                  {selectedTicket.ticketType}
                </Badge>
                <p className="text-center mb-1">{selectedTicket.date} • {selectedTicket.time}</p>
                <p className="text-center text-muted-foreground mb-4">{selectedTicket.location}</p>
                
                <div className="w-full border-t border-border/30 my-2 pt-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Quantity</p>
                      <p className="font-medium">{selectedTicket.quantity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">{selectedTicket.price}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" className="logo font-medium" onClick={() => shareTicket(selectedTicket)}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="glow" className="logo font-medium">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Tickets;