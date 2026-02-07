import api, { mapFromApi, mapToApi } from '@/lib/api';
import { Ticket, PurchaseTicketRequest, PurchaseResponse } from '@/types';

/** POST /tickets/purchase — purchase tickets */
export const purchaseTicket = async (req: PurchaseTicketRequest): Promise<PurchaseResponse> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/tickets/purchase', payload);
  return mapFromApi<PurchaseResponse>(data);
};

/** GET /tickets/me — current user's tickets */
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

/** GET /tickets/event/:eventId — tickets for an event (organizer) */
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
