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

/** POST /tickets/purchase - Purchase tickets */
export const purchaseTicket = async (req: PurchaseTicketRequest): Promise<PurchaseResponse> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/tickets/purchase', payload);
  return mapFromApi<PurchaseResponse>(data);
};

/** GET /tickets/me - Current user's tickets */
export const getMyTickets = async (): Promise<Ticket[]> => {
  try {
    const { data } = await api.get('/tickets/me');
    const mapped = mapFromApi<{ tickets: Ticket[] }>(data);
    return mapped.tickets || [];
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
};

/** GET /tickets/event/:eventId - Event tickets (organizer) */
export const getEventTickets = async (eventId: string): Promise<Ticket[]> => {
  try {
    const { data } = await api.get(`/tickets/event/${eventId}`);
    const mapped = mapFromApi<{ tickets: Ticket[] }>(data);
    return mapped.tickets || [];
  } catch (error) {
    console.error('Error fetching event tickets:', error);
    return [];
  }
};
