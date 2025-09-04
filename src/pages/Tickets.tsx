// src/pages/Tickets.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTicket, Ticket } from "@/contexts/TicketContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AnimatedLogo from "@/components/AnimatedLogo";
import TicketCard from "@/components/TicketCard";
import EmptyState from "@/components/EmptyState";
import { ArrowLeft } from "lucide-react";

const Tickets = () => {
  const { user } = useAuth();
  const { getUserTickets, loading, error } = useTicket();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      const fetchTickets = async () => {
        const userTickets = await getUserTickets(user.email);
        setTickets(userTickets || []);
      };
      fetchTickets();
    }
  }, [user, getUserTickets]);

  const viewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDetailsOpen(true);
  };

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
          <h2 className="text-2xl font-bold watermark mb-4">Error Loading Tickets</h2>
          <p className="text-muted-foreground font-montserrat mb-8">{error}</p>
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
          <h1 className="text-3xl font-bold watermark mb-2">My Tickets</h1>
          <p className="text-muted-foreground font-montserrat">Access and manage your event tickets</p>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div
              key={ticket.ticketId}
              onClick={() => viewTicket(ticket)}
              className="cursor-pointer"
            >
              <TicketCard ticket={ticket} />
            </div>
          ))}
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

      <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4 rounded-[var(--radius)]">
          {selectedTicket && <TicketCard ticket={selectedTicket} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tickets;