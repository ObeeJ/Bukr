import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share, QrCode, Eye, Users, ChevronRight } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import AnimatedLogo from "@/components/AnimatedLogo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import EventCollaborators from "@/components/EventCollaborators";

const MyEvents = () => {
  const { user } = useAuth();
  const [ticketPreviewOpen, setTicketPreviewOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"tickets" | "events">("tickets");
  
  const isOrganizer = user?.userType === 'organizer';
  
  const myTickets = [
    {
      id: "1",
      title: "Summer Music Festival",
      location: "Central Park, NYC",
      date: "7/15/2025",
      time: "18:00",
      seats: "A-15, A-16",
      ticketNumber: "SMF2025001",
      status: "confirmed" as const,
      image: "🎵"
    },
    {
      id: "2", 
      title: "Broadway Musical",
      location: "Times Square Theater",
      date: "7/8/2025",
      time: "20:00",
      seats: "Orchestra-12C, 12D",
      ticketNumber: "BM2025002",
      status: "confirmed" as const,
      image: "🎭"
    },
    {
      id: "3",
      title: "Art Gallery Opening",
      location: "MoMA",
      date: "6/20/2025",
      time: "19:00",
      seats: "General Admission",
      ticketNumber: "AG2025003",
      status: "expired" as const,
      image: "🎨"
    }
  ];
  
  const myOrganizerEvents = [
    {
      id: "101",
      title: "Tech Conference 2023",
      location: "Convention Center, SF",
      date: "8/20/2023",
      time: "9:00 AM",
      totalTickets: 1000,
      soldTickets: 850,
      revenue: "$127,500",
      status: "active" as const,
      image: "💻"
    },
    {
      id: "102",
      title: "Music Festival",
      location: "Central Park, NY",
      date: "7/15/2023",
      time: "6:00 PM",
      totalTickets: 2000,
      soldTickets: 1250,
      revenue: "$62,500",
      status: "active" as const,
      image: "🎵"
    },
    {
      id: "103",
      title: "Art Exhibition",
      location: "Modern Art Gallery, LA",
      date: "9/10/2023",
      time: "10:00 AM",
      totalTickets: 500,
      soldTickets: 320,
      revenue: "$16,000",
      status: "active" as const,
      image: "🎨"
    }
  ];

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <AnimatedLogo size="sm" />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-glow mb-2">
          {isOrganizer ? "My Events" : "My Tickets"}
        </h1>
        <p className="text-muted-foreground">
          {isOrganizer 
            ? "Manage your events and collaborators" 
            : "Your booked tickets and past events"}
        </p>
      </div>

      {isOrganizer ? (
        <div className="space-y-6">
          {myOrganizerEvents.map((event, index) => (
            <div 
              key={event.id} 
              className="glass-card hover-glow animate-fade-in p-6"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Header with status */}
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                  {event.image}
                </div>
                <Badge className="status-badge status-confirmed">
                  {event.status.toUpperCase()}
                </Badge>
              </div>

              {/* Event Details */}
              <div className="space-y-3 mb-6">
                <h3 className="text-xl font-bold text-foreground">{event.title}</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="text-foreground font-medium">{event.location}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="text-foreground font-medium">{event.date}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="text-foreground font-medium">{event.time}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tickets Sold:</span>
                    <p className="text-foreground font-medium">{event.soldTickets}/{event.totalTickets}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-glass-border/30">
                  <span className="text-muted-foreground text-sm">Revenue:</span>
                  <p className="text-foreground font-medium">{event.revenue}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Link to={`/scan/${event.id}`} className="flex-1">
                  <Button 
                    variant="glow" 
                    className="w-full logo font-medium"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Tickets
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => {
                    // Open collaborator management
                    setSelectedTicket(event);
                    setTicketPreviewOpen(true);
                  }}
                >
                  <Users className="w-4 h-4" />
                  Collaborators
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {myOrganizerEvents.length === 0 && (
            <EmptyState
              title="No Events Created"
              description="You haven't created any events yet. Create your first event to start selling tickets!"
              icon="🎫"
              action={{
                label: "Create Event",
                onClick: () => window.location.href = "/#/create-event"
              }}
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {myTickets.map((ticket, index) => (
            <div 
              key={ticket.id} 
              className={`glass-card hover-glow animate-fade-in p-6 ${ticket.status === 'expired' ? 'glass-card-expired' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Header with status */}
              <div className="flex justify-between items-start mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl">
                  {ticket.image}
                </div>
                <Badge className={`status-badge ${ticket.status === "confirmed" ? "status-confirmed" : "status-expired"}`}>
                  {ticket.status.toUpperCase()}
                </Badge>
              </div>

              {/* Event Details */}
              <div className="space-y-3 mb-6">
                <h3 className="text-xl font-bold text-foreground">{ticket.title}</h3>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="text-foreground font-medium">{ticket.location}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="text-foreground font-medium">{ticket.date}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="text-foreground font-medium">{ticket.time}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Seats:</span>
                    <p className="text-foreground font-medium">{ticket.seats}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-glass-border/30">
                  <span className="text-muted-foreground text-sm">Ticket #:</span>
                  <p className="text-foreground font-mono font-medium">{ticket.ticketNumber}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  variant="glow" 
                  className="flex-1 logo font-medium"
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setTicketPreviewOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Ticket
                </Button>
                {ticket.status === "confirmed" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <Share className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {myTickets.length === 0 && (
            <EmptyState
              title="No Tickets Booked"
              description="You haven't booked any events yet. Explore amazing events and book your first ticket!"
              icon="🎫"
              action={{
                label: "Explore Events",
                onClick: () => window.location.href = "/#/app"
              }}
            />
          )}
        </div>
      )}

      {/* Collaborator Management Modal for Organizers */}
      {isOrganizer && selectedTicket && (
        <Dialog open={ticketPreviewOpen} onOpenChange={setTicketPreviewOpen}>
          <DialogContent className="glass-card border-glass-border max-w-3xl mx-4">
            <EventCollaborators 
              eventId={selectedTicket.id} 
              eventName={selectedTicket.title} 
              totalTickets={selectedTicket.totalTickets} 
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Ticket Preview Modal for Users */}
      {!isOrganizer && selectedTicket && (
        <Dialog open={ticketPreviewOpen} onOpenChange={setTicketPreviewOpen}>
          <DialogContent className="glass-card border-glass-border max-w-md mx-4">
            <div className="space-y-6">
              <div className="text-center">
                <AnimatedLogo size="sm" />
                <h3 className="text-xl font-bold mt-2">{selectedTicket.title}</h3>
                <p className="text-muted-foreground">{selectedTicket.date} • {selectedTicket.time}</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl">
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                  {/* This would be a real QR code in production */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${selectedTicket.ticketNumber}`} 
                    alt="Ticket QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-center text-black">
                  <p className="font-mono font-bold">{selectedTicket.ticketNumber}</p>
                  <p className="text-sm text-gray-500 mt-1">Seats: {selectedTicket.seats}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 logo font-medium" onClick={() => setTicketPreviewOpen(false)}>
                  Close
                </Button>
                <Button variant="glow" className="flex-1 logo font-medium">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MyEvents;