/**
 * API CLIENT - Tickets
 * 
 * Tickets API: HTTP client for ticket operations
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: API client (axios), type mappers
 * Responsibility: HTTP requests to tickets endpoints
 * 
 * Endpoints:
 * - POST /tickets/purchase: Purchase tickets
 * - GET /tickets/me: User's tickets
 * - GET /tickets/event/:eventId: Event tickets (organizer)
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';
import { Ticket, PurchaseTicketRequest, PurchaseResponse } from '@/types';

/**
 * purchaseTicket
 * High-level: Initiates a ticket purchase for an event (handles payment + ticket creation).
 * Low-level: Converts the PurchaseTicketRequest to snake_case, POSTs to /tickets/purchase,
 * and returns a PurchaseResponse (which includes payment intent or confirmation details).
 */
export const purchaseTicket = async (req: PurchaseTicketRequest): Promise<PurchaseResponse> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/tickets/purchase', payload);
  return mapFromApi<PurchaseResponse>(data);
};

/**
 * getMyTickets
 * High-level: Fetches all tickets owned by the currently authenticated user.
 * Low-level: GETs /tickets/me (JWT-scoped), extracts the `tickets` array from
 * the response envelope. Returns [] on error so the tickets screen renders safely.
 */
export const getMyTickets = async (): Promise<Ticket[]> => {
  try {
    const { data } = await api.get('/tickets/me');
    const mapped = mapFromApi<{ tickets: Ticket[] }>(data);
    return mapped.tickets || [];
  } catch {
    return [];
  }
};

/**
 * getEventTickets
 * High-level: Fetches all tickets sold for a specific event (organizer view).
 * Low-level: GETs /tickets/event/:eventId and extracts the `tickets` array.
 * Protected — only the event owner/organizer can access this.
 */
export const getEventTickets = async (eventId: string): Promise<Ticket[]> => {
  try {
    const { data } = await api.get(`/tickets/event/${eventId}`);
    const mapped = mapFromApi<{ tickets: Ticket[] }>(data);
    return mapped.tickets || [];
  } catch {
    return [];
  }
};

/**
 * transferTicket
 * High-level: Permanently transfers ownership of a ticket to another user by email.
 * Low-level: POSTs { to_email } to /tickets/:ticketId/transfer.
 * Irreversible — the original owner loses access after this call.
 * Returns transferId and timestamp for audit trail.
 */
export const transferTicket = async (ticketId: string, toEmail: string): Promise<{ transferId: string; transferredAt: string }> => {
  const { data } = await api.post(`/tickets/${ticketId}/transfer`, { to_email: toEmail });
  return mapFromApi(data);
};

/**
 * getTicketQR
 * High-level: Fetches a fresh, 3-second rotating QR payload for a ticket.
 * Low-level: GETs /tickets/:ticketId/qr.
 */
export const getTicketQR = async (ticketId: string): Promise<string> => {
  const { data } = await api.get(`/tickets/${ticketId}/qr`);
  return data.qrData || '';
};

export const renewTicket = async (ticketId: string): Promise<{
  renewed: boolean;
  message: string;
  usageLeft?: number;
  requiresPayment: boolean;
  paymentAmount?: number;
  paymentCurrency?: string;
}> => {
  const { data } = await api.post(`/tickets/${ticketId}/renew`);
  return mapFromApi(data.data || data);
};
