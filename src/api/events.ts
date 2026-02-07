import api, { mapFromApi, mapToApi } from '@/lib/api';
import { Event, EventListResponse } from '@/types';

interface ListEventsParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
  search?: string;
}

/** GET /events — public, returns paginated events */
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

/** GET /events — returns full paginated response */
export const getEventsPaginated = async (params?: ListEventsParams): Promise<EventListResponse> => {
  const { data } = await api.get('/events', { params });
  return mapFromApi<EventListResponse>(data);
};

/** GET /events/me — organizer's events */
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

/** GET /events/:id — single event by UUID */
export const getEventById = async (id: string): Promise<Event | null> => {
  try {
    const { data } = await api.get(`/events/${id}`);
    return mapFromApi<Event>(data);
  } catch (error) {
    console.error('Error fetching event:', error);
    return null;
  }
};

/** GET /events/key/:eventKey — single event by key */
export const getEventByKey = async (eventKey: string): Promise<Event | null> => {
  try {
    const { data } = await api.get(`/events/key/${eventKey}`);
    return mapFromApi<Event>(data);
  } catch (error) {
    console.error('Error fetching event by key:', error);
    return null;
  }
};

/** GET /events/search — search events */
export const searchEvents = async (query: string): Promise<Event[]> => {
  return getAllEvents({ search: query });
};

/** GET /events/categories */
export const getCategories = async (): Promise<string[]> => {
  try {
    const { data } = await api.get('/events/categories');
    return data?.categories || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

/** POST /events — create a new event (organizer) */
export const createEvent = async (eventData: Partial<Event>): Promise<Event> => {
  const payload = mapToApi(eventData);
  const { data } = await api.post('/events', payload);
  return mapFromApi<Event>(data);
};

/** PUT /events/:id — update an event (organizer) */
export const updateEvent = async (id: string, eventData: Partial<Event>): Promise<Event> => {
  const payload = mapToApi(eventData);
  const { data } = await api.put(`/events/${id}`, payload);
  return mapFromApi<Event>(data);
};

/** DELETE /events/:id */
export const deleteEvent = async (id: string): Promise<void> => {
  await api.delete(`/events/${id}`);
};
