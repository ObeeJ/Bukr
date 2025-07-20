import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTicket, Ticket } from '@/contexts/TicketContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import AnimatedLogo from '@/components/AnimatedLogo';
import TicketCard from '@/components/TicketCard';
import EmptyState from '@/components/EmptyState';

const Tickets = () => {
  const { user } = useAuth();
  const { getUserTickets } = useTicket();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);

  useEffect(() => {
    if (user?.email) {
      // Get user tickets from context
      const userTickets = getUserTickets(user.email);
      setTickets(userTickets);
    }
  }, [user, getUserTickets]);

  const viewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setTicketDetailsOpen(true);
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

      {tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket.id} onClick={() => viewTicket(ticket)}>
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
            onClick: () => window.location.href = "/#/app"
          }}
        />
      )}

      {/* Ticket Details Dialog */}
      <Dialog open={ticketDetailsOpen} onOpenChange={setTicketDetailsOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          {selectedTicket && <TicketCard ticket={selectedTicket} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tickets;