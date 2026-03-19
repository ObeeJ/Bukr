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

/**
 * getAllEvents
 * High-level: Fetches the public event listing, optionally filtered/paginated.
 * Low-level: GETs /events with optional query params (page, limit, category, status, search).
 * Returns an empty array on error so callers never have to null-check.
 */
export const getAllEvents = async (params?: ListEventsParams): Promise<Event[]> => {
  try {
    const { data } = await api.get('/events', { params });
    const mapped = mapFromApi<EventListResponse>(data);
    return mapped.events || [];
  } catch {
    return [];
  }
};

/**
 * getEventsPaginated
 * High-level: Same as getAllEvents but returns the full paginated envelope (total, page, events[]).
 * Low-level: GETs /events and returns the raw mapped EventListResponse so the UI
 * can render pagination controls.
 */
export const getEventsPaginated = async (params?: ListEventsParams): Promise<EventListResponse> => {
  const { data } = await api.get('/events', { params });
  return mapFromApi<EventListResponse>(data);
};

/**
 * getMyEvents
 * High-level: Fetches only the events owned by the currently authenticated organizer.
 * Low-level: GETs /events/me (JWT-protected). Returns empty array on error
 * so the dashboard renders gracefully even if the request fails.
 */
export const getMyEvents = async (params?: { page?: number; limit?: number }): Promise<Event[]> => {
  try {
    const { data } = await api.get('/events/me', { params });
    const mapped = mapFromApi<EventListResponse>(data);
    return mapped.events || [];
  } catch {
    return [];
  }
};

/**
 * getEventById
 * High-level: Loads a single event's full detail by its UUID.
 * Low-level: GETs /events/:id and maps the response. Returns null on 404/error
 * so callers can show a "not found" state without crashing.
 */
export const getEventById = async (id: string): Promise<Event | null> => {
  try {
    const { data } = await api.get(`/events/${id}`);
    return mapFromApi<Event>(data);
  } catch {
    return null;
  }
};

/**
 * getEventByKey
 * High-level: Loads an event using its human-readable URL slug (e.g. "afrobeats-lagos-2025").
 * Low-level: GETs /events/key/:eventKey. Used on public event pages where the URL
 * contains the key, not the UUID.
 */
export const getEventByKey = async (eventKey: string): Promise<Event | null> => {
  try {
    const { data } = await api.get(`/events/key/${eventKey}`);
    return mapFromApi<Event>(data);
  } catch {
    return null;
  }
};

/**
 * searchEvents
 * High-level: Thin wrapper that runs a text search over all events.
 * Low-level: Delegates to getAllEvents with the `search` param set.
 * Kept separate so search call-sites stay readable.
 */
export const searchEvents = async (query: string): Promise<Event[]> => {
  return getAllEvents({ search: query });
};

/**
 * getCategories
 * High-level: Fetches the list of distinct event categories for filter UI.
 * Low-level: GETs /events/categories and extracts the `categories` array.
 * Returns empty array on error so the filter dropdown still renders.
 */
export const getCategories = async (): Promise<string[]> => {
  try {
    const { data } = await api.get('/events/categories');
    return data?.categories || [];
  } catch {
    return [];
  }
};

/**
 * createEvent
 * High-level: Creates a new event under the authenticated organizer's account.
 * Low-level: Converts camelCase eventData → snake_case via mapToApi, POSTs to /events,
 * then maps the response back to a typed Event.
 */
export const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  const payload = mapToApi(eventData);
  const { data } = await api.post('/events', payload);
  return mapFromApi<Event>(data);
};

/**
 * updateEvent
 * High-level: Updates an existing event's details (organizer/owner only).
 * Low-level: PUTs the full or partial payload to /events/:id after snake_case conversion.
 * Backend enforces ownership — non-owners get 403.
 */
export const updateEvent = async (id: string, eventData: Partial<Event>): Promise<Event> => {
  const payload = mapToApi(eventData);
  const { data } = await api.put(`/events/${id}`, payload);
  return mapFromApi<Event>(data);
};

/**
 * deleteEvent
 * High-level: Permanently deletes an event (owner only).
 * Low-level: Sends DELETE /events/:id. No response body expected.
 * Irreversible — callers should confirm with the user before calling.
 */
export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`);
};

/**
 * claimFreeTicket
 * High-level: Lets a user claim a free ticket for a zero-cost event.
 * Low-level: POSTs { eventId } to /tickets/claim-free (snake_case via mapToApi).
 * Bypasses the payment flow entirely — only valid when event price is 0.
 */
export const claimFreeTicket = async (eventId: string): Promise<any> => {
  const { data } = await api.post(`/tickets/claim-free`, mapToApi({ eventId }));
  return mapFromApi(data);
};

/**
 * assignScanner
 * High-level: Grants a user scanner-role access to a specific event.
 * Low-level: POSTs { scanner_email } to /events/:eventId/scanners.
 * The assigned user can then authenticate via verifyAccess in scanner.ts.
 */
export const assignScanner = async (eventId: string, scannerEmail: string): Promise<void> => {
  await api.post(`/events/${eventId}/scanners`, { scanner_email: scannerEmail });
};

/**
 * listScanners
 * High-level: Returns all users currently assigned as scanners for an event.
 * Low-level: GETs /events/:eventId/scanners and extracts the `scanners` array.
 * Used in the organizer dashboard to manage gate staff.
 */
export const listScanners = async (eventId: string): Promise<any[]> => {
  const { data } = await api.get(`/events/${eventId}/scanners`);
  return mapFromApi(data?.scanners || []);
};

/**
 * removeScanner
 * High-level: Revokes scanner access for a specific user on a specific event.
 * Low-level: Sends DELETE /events/:eventId/scanners/:scannerId.
 * After this call the removed user's verifyAccess calls will return invalid.
 */
export const removeScanner = async (eventId: string, scannerId: string): Promise<void> => {
  await api.delete(`/events/${eventId}/scanners/${scannerId}`);
};
