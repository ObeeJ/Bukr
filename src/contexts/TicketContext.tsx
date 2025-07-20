import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuid } from 'uuid';

// Define types
export interface Ticket {
  id: string;
  ticketId: string;
  eventId: string;
  eventKey: string;
  userEmail: string;
  userName: string;
  ticketType: string;
  quantity: number;
  price: string;
  purchaseDate: string;
  status: 'valid' | 'used' | 'invalid';
  scanned?: boolean;
  scanDate?: string;
}

interface TicketContextType {
  tickets: Ticket[];
  saveTicket: (ticket: Omit<Ticket, 'id' | 'purchaseDate' | 'status'>) => string;
  getTicket: (ticketId: string) => Ticket | undefined;
  validateTicket: (ticketId: string, eventKey: string) => { isValid: boolean; ticket?: Ticket; message: string };
  markTicketAsUsed: (ticketId: string) => void;
  getUserTickets: (userEmail: string) => Ticket[];
  getEventTickets: (eventId: string) => Ticket[];
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Mock initial data
  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "1",
      ticketId: "BUKR-1234-101",
      eventId: "101",
      eventKey: "some-uuid-key-1",
      userEmail: "user@example.com",
      userName: "Alex Johnson",
      ticketType: "General Admission",
      quantity: 2,
      price: "$150",
      purchaseDate: "2023-08-01T12:00:00Z",
      status: "valid"
    },
    {
      id: "2",
      ticketId: "BUKR-5678-102",
      eventId: "102",
      eventKey: "some-uuid-key-2",
      userEmail: "user@example.com",
      userName: "Alex Johnson",
      ticketType: "VIP",
      quantity: 1,
      price: "$50",
      purchaseDate: "2023-07-01T12:00:00Z",
      status: "valid"
    }
  ]);

  const saveTicket = (ticketData: Omit<Ticket, 'id' | 'purchaseDate' | 'status'>) => {
    const id = uuid();
    const newTicket = {
      ...ticketData,
      id,
      purchaseDate: new Date().toISOString(),
      status: 'valid' as const
    };
    
    setTickets(prev => [...prev, newTicket]);
    return id;
  };

  const getTicket = (ticketId: string) => {
    return tickets.find(ticket => ticket.ticketId === ticketId);
  };

  const validateTicket = (ticketId: string, eventKey: string) => {
    const ticket = tickets.find(t => t.ticketId === ticketId);
    
    if (!ticket) {
      return { isValid: false, message: "Ticket not found" };
    }
    
    if (ticket.eventKey !== eventKey) {
      return { isValid: false, message: "Invalid ticket for this event" };
    }
    
    if (ticket.status === 'used') {
      return { isValid: false, ticket, message: "Ticket already used" };
    }
    
    if (ticket.status === 'invalid') {
      return { isValid: false, ticket, message: "Ticket is invalid" };
    }
    
    return { isValid: true, ticket, message: "Valid ticket" };
  };

  const markTicketAsUsed = (ticketId: string) => {
    setTickets(prev => 
      prev.map(ticket => 
        ticket.ticketId === ticketId 
          ? { ...ticket, status: 'used' as const, scanned: true, scanDate: new Date().toISOString() } 
          : ticket
      )
    );
  };

  const getUserTickets = (userEmail: string) => {
    return tickets.filter(ticket => ticket.userEmail === userEmail);
  };

  const getEventTickets = (eventId: string) => {
    return tickets.filter(ticket => ticket.eventId === eventId);
  };

  return (
    <TicketContext.Provider value={{
      tickets,
      saveTicket,
      getTicket,
      validateTicket,
      markTicketAsUsed,
      getUserTickets,
      getEventTickets
    }}>
      {children}
    </TicketContext.Provider>
  );
};

export const useTicket = () => {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTicket must be used within a TicketProvider');
  }
  return context;
};