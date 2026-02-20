/**
 * PRESENTATION LAYER - Ticket Context
 * 
 * TicketContext: The ticket manager - handling ticket operations
 * 
 * Architecture Layer: Presentation (Layer 1)
 * Dependencies: API clients (tickets, scanner)
 * Responsibility: Global ticket state management
 * 
 * Features:
 * - Ticket purchase
 * - User tickets retrieval
 * - Event tickets retrieval
 * - Ticket validation (scanner)
 * - Mark ticket as used
 * - Local ticket cache
 * 
 * Integration:
 * - Backend: Ticket purchase API
 * - Scanner: QR validation
 * - Payment: Payment flow integration
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Ticket, PurchaseTicketRequest, PurchaseResponse, ScanValidationResult } from '@/types';
import { purchaseTicket as apiPurchaseTicket, getMyTickets, getEventTickets as apiGetEventTickets } from '@/api/tickets';
import { validateTicket as apiValidateTicket, markTicketUsed as apiMarkTicketUsed } from '@/api/scanner';

interface TicketContextType {
  tickets: Ticket[];                                                    // Cached tickets
  loading: boolean;
  error: string | null;
  purchaseTicket: (req: PurchaseTicketRequest) => Promise<PurchaseResponse>;
  getUserTickets: (email?: string) => Promise<Ticket[]>;               // Get user's tickets
  getEventTickets: (eventId: string) => Promise<Ticket[]>;             // Get event tickets
  validateTicket: (ticketId: string, eventKey: string) => Promise<ScanValidationResult>;
  markTicketAsUsed: (ticketId: string) => Promise<void>;
  saveTicket: (ticket: Ticket) => Promise<void>;                       // Legacy: client-side save
}

// Re-export Ticket type for convenience
export type { Ticket };

// Create context
const TicketContext = createContext<TicketContextType | undefined>(undefined);

/**
 * TicketProvider: Global ticket state provider
 */
export const TicketProvider = ({ children }: { children: React.ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Purchase ticket
   * 
   * Flow:
   * 1. Call purchase API
   * 2. Add ticket to local cache
   * 3. Return purchase response (includes payment info)
   */
  const purchaseTicket = async (req: PurchaseTicketRequest): Promise<PurchaseResponse> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiPurchaseTicket(req);
      // Add new ticket to local state
      setTickets(prev => [...prev, result.ticket]);
      return result;
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get user's tickets
   * Fetches from API and updates cache
   */
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

  /**
   * Get tickets for specific event
   */
  const getEventTickets = async (eventId: string): Promise<Ticket[]> => {
    return apiGetEventTickets(eventId);
  };

  /**
   * Validate ticket (scanner)
   * Checks if ticket is valid for event
   */
  const validateTicket = async (ticketId: string, eventKey: string): Promise<ScanValidationResult> => {
    return apiValidateTicket(ticketId, eventKey);
  };

  /**
   * Mark ticket as used (scanner)
   * Updates local cache to reflect used status
   */
  const markTicketAsUsed = async (ticketId: string): Promise<void> => {
    await apiMarkTicketUsed(ticketId);
    setTickets(prev =>
      prev.map(t => t.ticketId === ticketId ? { ...t, status: 'used' as const } : t)
    );
  };

  /**
   * Save ticket (legacy)
   * Used by PurchasePage for client-side ticket creation
   */
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

/**
 * useTicket: Hook to access ticket context
 */
export const useTicket = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTicket must be used within a TicketProvider');
  }
  return context;
};
