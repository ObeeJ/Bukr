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

interface EventContextType {
  events: Event[];
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

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const addEvent = async (eventData: Partial<Event>): Promise<Event> => {
    const newEvent = await apiCreateEvent(eventData);
    setEvents(prev => [...prev, newEvent]);
    return newEvent;
  };

  const updateEventFn = async (id: string, eventData: Partial<Event>): Promise<Event> => {
    const updated = await apiUpdateEvent(id, eventData);
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
    return updated;
  };

  const removeEvent = async (id: string): Promise<void> => {
    await apiDeleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const getEvent = async (id: string): Promise<Event | null> => {
    const cached = events.find(e => e.id === id);
    if (cached) return cached;
    return getEventById(id);
  };

  const getEventByKeyFn = async (key: string): Promise<Event | null> => {
    const cached = events.find(e => e.eventKey === key);
    if (cached) return cached;
    return getEventByKey(key);
  };

  const getPromos = async (eventId: string): Promise<PromoCode[]> => {
    return getEventPromos(eventId);
  };

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

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};
