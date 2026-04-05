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
  events: Event[];        // Public events (alias for publicEvents — backward compat)
  publicEvents: Event[];  // All public events
  myEvents: Event[];      // Organizer's own events — never mixed with publicEvents
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  addEvent: (event: Partial<Event>) => Promise<Event>;
  updateEvent: (id: string, event: Partial<Event>) => Promise<Event>;
  removeEvent: (id: string) => Promise<void>;
  getEvent: (id: string) => Promise<Event | null>;
  getEventByKey: (key: string) => Promise<Event | null>;
  getPromos: (eventId: string) => Promise<PromoCode[]>;
  validatePromo: (eventId: string, code: string) => Promise<PromoCode | null>;
  fetchEvents: () => Promise<void>;
  fetchMyEvents: () => Promise<void>;
  isLoading: boolean;
  loading: boolean;
  error: string | null;
}

// Create context
const EventContext = createContext<EventContextType | undefined>(undefined);

/**
 * EventProvider: Global event state provider
 */
export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  // Two separate arrays — public listing and organizer's own events never share state.
  // Mixing them caused the dashboard to show wrong revenue when fetchEvents() ran after fetchMyEvents().
  const [publicEvents, setPublicEvents] = useState<Event[]>([]);
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllEvents();
      setPublicEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMyEvents();
      setMyEvents(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your events');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addEvent = async (eventData: Partial<Event>): Promise<Event> => {
    setError(null);
    try {
      const newEvent = await apiCreateEvent(eventData);
      setMyEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err: any) {
      const msg = err.message || 'Failed to create event';
      setError(msg);
      throw new Error(msg);
    }
  };

  const updateEventFn = async (id: string, eventData: Partial<Event>): Promise<Event> => {
    setError(null);
    try {
      const updated = await apiUpdateEvent(id, eventData);
      setMyEvents(prev => prev.map(e => e.id === id ? updated : e));
      return updated;
    } catch (err: any) {
      const msg = err.message || 'Failed to update event';
      setError(msg);
      throw new Error(msg);
    }
  };

  const removeEvent = async (id: string): Promise<void> => {
    setError(null);
    try {
      await apiDeleteEvent(id);
      setMyEvents(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      const msg = err.message || 'Failed to delete event';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Check both caches before hitting the network
  const getEvent = async (id: string): Promise<Event | null> => {
    const cached = myEvents.find(e => e.id === id) || publicEvents.find(e => e.id === id);
    if (cached) return cached;
    return getEventById(id);
  };

  const getEventByKeyFn = async (key: string): Promise<Event | null> => {
    const cached = myEvents.find(e => e.eventKey === key) || publicEvents.find(e => e.eventKey === key);
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
      events: publicEvents,  // backward-compat alias
      publicEvents,
      myEvents,
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
