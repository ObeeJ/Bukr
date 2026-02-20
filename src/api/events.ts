/**
 * API CLIENT - Events
 * 
 * Events API: HTTP client for event operations
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: API client (axios), type mappers
 * Responsibility: HTTP requests to events endpoints
 * 
 * Endpoints:
 * - GET /events: List/search events (public)
 * - GET /events/me: Organizer's events (protected)
 * - GET /events/:id: Get by ID (public)
 * - GET /events/key/:key: Get by URL slug (public)
 * - GET /events/categories: Get categories (public)
 * - POST /events: Create event (organizer)
 * - PUT /events/:id: Update event (organizer)
 * - DELETE /events/:id: Delete event (organizer)
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';
import { Event, EventListResponse } from '@/types';

// Query parameters for event listing
interface ListEventsParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  search?: string;
}

/** GET /events - List all events (public) */
export const getAllEvents = async (params?: ListEventsParams): Promise<Event[]> => {
  try {
    const { data } = await api.get('/events', { params });
    const mapped = mapFromApi<EventListResponse>(data);
    return mapped.events || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

/** GET /events - Full paginated response */
export const getEventsPaginated = async (params?: ListEventsParams): Promise<EventListResponse> => {
  const { data } = await api.get('/events', { params });
  return mapFromApi<EventListResponse>(data);
};

/** GET /events/me - Organizer's events (protected) */
export const getMyEvents = async (params?: { page?: number; limit?: number }): Promise<Event[]> => {
  try {
    const { data } = await api.get('/events/me', { params });
    const mapped = mapFromApi<EventListResponse>(data);
    return mapped.events || [];
  } catch (error) {
    console.error('Error fetching my events:', error);
    return [];
  }
};

/** GET /events/:id - Get event by UUID */
export const getEventById = async (id: string): Promise<Event | null> => {
  try {
    const { data } = await api.get(`/events/${id}`);
    return mapFromApi<Event>(data);
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
};

/** GET /events/key/:eventKey - Get event by URL slug */
export const getEventByKey = async (eventKey: string): Promise<Event | null> => {
  try {
    const { data } = await api.get(`/events/key/${eventKey}`);
    return mapFromApi<Event>(data);
  } catch (error) {
    console.error('Error fetching event by key:', error);
    return null;
  }
};

/** GET /events/search - Search events by query */
export const searchEvents = async (query: string): Promise<Event[]> => {
  return getAllEvents({ search: query });
};

/** GET /events/categories - Get distinct categories */
export const getCategories = async (): Promise<string[]> => {
  try {
    const { data } = await api.get('/events/categories');
    return data?.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/** POST /events - Create event (organizer only) */
export const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  const payload = mapToApi(eventData);
  const { data } = await api.post('/events', payload);
  return mapFromApi<Event>(data);
};

/** PUT /events/:id - Update event (owner only) */
export const updateEvent = async (id: string, eventData: Partial<Event>): Promise<Event> => {
  const payload = mapToApi(eventData);
  const { data } = await api.put(`/events/${id}`, payload);
  return mapFromApi<Event>(data);
};

/** DELETE /events/:id - Delete event (owner only) */
export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`);
};

/** POST /events/:id/claim - Claim free ticket */
export const claimFreeTicket = async (eventId: string): Promise<any> => {
  const { data } = await api.post(`/tickets/claim-free`, mapToApi({ eventId }));
  return mapFromApi(data);
};

/** POST /events/:id/scanners - Assign scanner to event */
export const assignScanner = async (eventId: string, userId: string): Promise<void> => {
  await api.post(`/events/${eventId}/scanners`, mapToApi({ userId }));
};

/** GET /events/:id/scanners - List event scanners */
export const listScanners = async (eventId: string): Promise<any[]> => {
  const { data } = await api.get(`/events/${eventId}/scanners`);
  return mapFromApi(data?.scanners || []);
};

/** DELETE /events/:id/scanners/:scannerId - Remove scanner from event */
export const removeScanner = async (eventId: string, scannerId: string): Promise<void> => {
  await api.delete(`/events/${eventId}/scanners/${scannerId}`);
};
