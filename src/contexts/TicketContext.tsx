import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, PurchaseTicketRequest, PurchaseResponse, ScanValidationResult } from '@/types';
import { purchaseTicket as apiPurchaseTicket, getMyTickets, getEventTickets as apiGetEventTickets } from '@/api/tickets';
import { validateTicket as apiValidateTicket, markTicketUsed as apiMarkTicketUsed } from '@/api/scanner';

interface TicketContextType {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  purchaseTicket: (req: PurchaseTicketRequest) => Promise<PurchaseResponse>;
  getUserTickets: (email?: string) => Promise<Ticket[]>;
  getEventTickets: (eventId: string) => Promise<Ticket[]>;
  validateTicket: (ticketId: string, eventKey: string) => Promise<ScanValidationResult>;
  markTicketAsUsed: (ticketId: string) => Promise<void>;
  // Legacy compatibility — saveTicket used by PurchasePage for client-side ticket creation
  saveTicket: (ticket: Ticket) => Promise<void>;
}

// Re-export Ticket type for pages that import it from here
export type { Ticket };

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider = ({ children }: { children: React.ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchaseTicket = async (req: PurchaseTicketRequest): Promise<PurchaseResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPurchaseTicket(req);
      // Add the new ticket to local state
      setTickets(prev => [...prev, result.ticket]);
      return result;
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserTickets = useCallback(async (_email?: string): Promise<Ticket[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyTickets();
      setTickets(data);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getEventTickets = async (eventId: string): Promise<Ticket[]> => {
    return apiGetEventTickets(eventId);
  };

  const validateTicket = async (ticketId: string, eventKey: string): Promise<ScanValidationResult> => {
    return apiValidateTicket(ticketId, eventKey);
  };

  const markTicketAsUsed = async (ticketId: string): Promise<void> => {
    await apiMarkTicketUsed(ticketId);
    setTickets(prev =>
      prev.map(t => t.ticketId === ticketId ? { ...t, status: 'used' as const } : t)
    );
  };

  // Legacy: used by PurchasePage if called before purchase API is fully connected
  const saveTicket = async (ticket: Ticket): Promise<void> => {
    setTickets(prev => [...prev, ticket]);
  };

  return (
    <TicketContext.Provider value={{
      tickets,
      loading,
      error,
      purchaseTicket,
      getUserTickets,
      getEventTickets,
      validateTicket,
      markTicketAsUsed,
      saveTicket,
    }}>
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
