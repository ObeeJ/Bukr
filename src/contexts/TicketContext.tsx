// src/contexts/TicketContext.tsx

import { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuid } from "uuid";
import { useToast } from "@/components/ui/use-toast";

// Define ticket interface
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
  status: "valid" | "used" | "invalid" | "cancelled";
  scanned?: boolean;
  scanDate?: string;
}

// Define context shape
interface TicketContextType {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  saveTicket: (ticketData: Omit<Ticket, "id" | "purchaseDate" | "status">) => Promise<string>;
  getTicket: (ticketId: string) => Promise<Ticket | null>;
  validateTicket: (ticketId: string, eventKey: string) => Promise<{
    isValid: boolean;
    ticket?: Ticket;
    message: string;
  }>;
  markTicketAsUsed: (ticketId: string) => Promise<void>;
  getUserTickets: (userEmail: string) => Promise<Ticket[]>;
  getEventTickets: (eventId: string) => Promise<Ticket[]>;
}

// Create context
const TicketContext = createContext<TicketContextType | undefined>(undefined);

// TicketProvider component
export const TicketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Save a new ticket
  const saveTicket = async (ticketData: Omit<Ticket, "id" | "purchaseDate" | "status">) => {
    setLoading(true);
    try {
      const id = uuid();
      const newTicket: Ticket = {
        ...ticketData,
        id,
        purchaseDate: new Date().toISOString(),
        status: "valid",
      };
      setTickets((prev) => [...prev, newTicket]);
      toast({
        title: "Ticket Saved",
        description: `Ticket ${newTicket.ticketId} successfully created`,
      });
      return id;
    } catch (err) {
      const errorMessage = "Failed to save ticket";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get a single ticket by ID
  const getTicket = async (ticketId: string) => {
    setLoading(true);
    try {
      const ticket = tickets.find((ticket) => ticket.ticketId === ticketId);
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      return ticket;
    } catch (err) {
      const errorMessage = "Failed to fetch ticket";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Validate a ticket
  const validateTicket = async (ticketId: string, eventKey: string) => {
    setLoading(true);
    try {
      const ticket = tickets.find((t) => t.ticketId === ticketId);
      if (!ticket) {
        return { isValid: false, message: "Ticket not found" };
      }
      if (ticket.eventKey !== eventKey) {
        return { isValid: false, message: "Invalid ticket for this event" };
      }
      if (ticket.status === "used") {
        return { isValid: false, ticket, message: "Ticket already used" };
      }
      if (ticket.status === "invalid" || ticket.status === "cancelled") {
        return { isValid: false, ticket, message: `Ticket is ${ticket.status}` };
      }
      return { isValid: true, ticket, message: "Valid ticket" };
    } catch (err) {
      const errorMessage = "Failed to validate ticket";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return { isValid: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Mark ticket as used
  const markTicketAsUsed = async (ticketId: string) => {
    setLoading(true);
    try {
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.ticketId === ticketId
            ? {
                ...ticket,
                status: "used",
                scanned: true,
                scanDate: new Date().toISOString(),
              }
            : ticket
        )
      );
      toast({
        title: "Ticket Used",
        description: `Ticket ${ticketId} marked as used`,
      });
    } catch (err) {
      const errorMessage = "Failed to mark ticket as used";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Get all tickets for a user
  const getUserTickets = async (userEmail: string) => {
    setLoading(true);
    try {
      const userTickets = tickets.filter((ticket) => ticket.userEmail === userEmail);
      return userTickets;
    } catch (err) {
      const errorMessage = "Failed to fetch user tickets";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get all tickets for an event
  const getEventTickets = async (eventId: string) => {
    setLoading(true);
    try {
      const eventTickets = tickets.filter((ticket) => ticket.eventId === eventId);
      return eventTickets;
    } catch (err) {
      const errorMessage = "Failed to fetch event tickets";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        loading,
        error,
        saveTicket,
        getTicket,
        validateTicket,
        markTicketAsUsed,
        getUserTickets,
        getEventTickets,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

// Hook to access ticket context
export const useTicket = (): TicketContextType => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTicket must be used within a TicketProvider");
  }
  return context;
};