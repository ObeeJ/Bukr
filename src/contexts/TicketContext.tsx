import React, { createContext, useContext, useState } from 'react';

interface Ticket {
  id: string;
  eventId: string;
  eventName: string;
  qrCode: string;
  status: 'valid' | 'used' | 'expired';
}

interface TicketContextType {
  tickets: Ticket[];
  addTicket: (ticket: Ticket) => void;
  scanTicket: (qrCode: string) => boolean;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider = ({ children }: { children: React.ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const addTicket = (ticket: Ticket) => {
    setTickets(prev => [...prev, ticket]);
  };

  const scanTicket = (qrCode: string) => {
    setTickets(prev => 
      prev.map(ticket => 
        ticket.qrCode === qrCode 
          ? { ...ticket, status: 'used' as const }
          : ticket
      )
    );
    return true; // Mock success
  };

  return (
    <TicketContext.Provider value={{ tickets, addTicket, scanTicket }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTicket = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTicket must be used within a TicketProvider');
  }
  return context;
};