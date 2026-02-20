/**
 * PRESENTATION LAYER - Event Context
 * 
 * EventContext: The event manager - handling event state and operations
 * 
 * Architecture Layer: Presentation (Layer 1)
 * Dependencies: API clients (events, promos)
 * Responsibility: Global event state management
 * 
 * Features:
 * - Event list management
 * - Selected event state
 * - CRUD operations (create, read, update, delete)
 * - Promo code validation
 * - Event search by ID or key
 * - My events (organizer)
 * 
 * State Management:
 * - Local cache of events
 * - Loading and error states
 * - Optimistic updates
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Event, PromoCode } from '@/types';
import {
  getAllEvents,
  getMyEvents,
  getEventById,
  getEventByKey,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
} from '@/api/events';
import { getEventPromos, validatePromo as apiValidatePromo } from '@/api/promos';

// Event context interface
interface EventContextType {
  events: Event[];                                              // Cached events
  selectedEvent: Event | null;                                  // Currently selected event
  setSelectedEvent: (event: Event | null) => void;
  addEvent: (event: Partial<Event>) => Promise<Event>;         // Create event
  updateEvent: (id: string, event: Partial<Event>) => Promise<Event>;
  removeEvent: (id: string) => Promise<void>;                   // Delete event
  getEvent: (id: string) => Promise<Event | null>;              // Get by ID
  getEventByKey: (key: string) => Promise<Event | null>;        // Get by URL slug
  getPromos: (eventId: string) => Promise<PromoCode[]>;         // Get promo codes
  validatePromo: (eventId: string, code: string) => Promise<PromoCode | null>;
  fetchEvents: () => Promise<void>;                             // Fetch all events
  fetchMyEvents: () => Promise<void>;                           // Fetch organizer's events
  isLoading: boolean;
  loading: boolean;                                             // Alias for isLoading
  error: string | null;
}

// Create context
const EventContext = createContext<EventContextType | undefined>(undefined);

/**
 * EventProvider: Global event state provider
 */
export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all public events
   */
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllEvents();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch organizer's events
   */
  const fetchMyEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyEvents();
      setEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create new event
   * Updates local cache optimistically
   */
  const addEvent = async (eventData: Partial<Event>): Promise<Event> => {
    const newEvent = await apiCreateEvent(eventData);
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  /**
   * Update existing event
   * Updates local cache
   */
  const updateEventFn = async (id: string, eventData: Partial<Event>): Promise<Event> => {
    const updated = await apiUpdateEvent(id, eventData);
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
    return updated;
  };

  /**
   * Delete event
   * Removes from local cache
   */
  const removeEvent = async (id: string): Promise<void> => {
    await apiDeleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  /**
   * Get event by ID
   * Checks cache first, then fetches from API
   */
  const getEvent = async (id: string): Promise<Event | null> => {
    const cached = events.find(e => e.id === id);
    if (cached) return cached;
    return getEventById(id);
  };

  /**
   * Get event by URL key (slug)
   * Checks cache first, then fetches from API
   */
  const getEventByKeyFn = async (key: string): Promise<Event | null> => {
    const cached = events.find(e => e.eventKey === key);
    if (cached) return cached;
    return getEventByKey(key);
  };

  /**
   * Get promo codes for event
   */
  const getPromos = async (eventId: string): Promise<PromoCode[]> => {
    return getEventPromos(eventId);
  };

  /**
   * Validate promo code
   * Returns discount info if valid
   */
  const validatePromo = async (eventId: string, code: string): Promise<PromoCode | null> => {
    return apiValidatePromo(eventId, code);
  };

  return (
    <EventContext.Provider value={{
      events,
      selectedEvent,
      setSelectedEvent,
      addEvent,
      updateEvent: updateEventFn,
      removeEvent,
      getEvent,
      getEventByKey: getEventByKeyFn,
      getPromos,
      validatePromo,
      fetchEvents,
      fetchMyEvents,
      isLoading,
      loading: isLoading,
      error,
    }}>
      {children}
    </EventContext.Provider>
  );
};

/**
 * useEvent: Hook to access event context
 */
export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
