import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";

const MyEvents = () => {
  const myEvents = [
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

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-glow mb-2">My Events</h1>
        <p className="text-muted-foreground">Your booked tickets and past events</p>
      </div>

      {/* Events List */}
      <div className="space-y-6">
        {myEvents.map((event, index) => (
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
              <Badge className={`status-badge ${event.status === "confirmed" ? "status-confirmed" : "status-expired"}`}>
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
                  <span className="text-muted-foreground">Seats:</span>
                  <p className="text-foreground font-medium">{event.seats}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-glass-border/30">
                <span className="text-muted-foreground text-sm">Ticket #:</span>
                <p className="text-foreground font-mono font-medium">{event.ticketNumber}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="glow" className="flex-1">
                <div className="w-4 h-4 mr-2 grid grid-cols-2 gap-0.5">
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                  <div className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                </div>
                View Ticket
              </Button>
              {event.status === "confirmed" && (
                <Button variant="outline" size="icon">
                  <Share className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {myEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">You haven't booked any events yet.</p>
          <Button variant="glow" className="mt-4">
            Explore Events
          </Button>
        </div>
      )}
    </div>
  );
};

export default MyEvents;