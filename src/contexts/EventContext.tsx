// src/contexts/EventContext.tsx

import { createContext, useContext, useState, ReactNode } from "react";
import { v4 as uuid } from "uuid";
import { useToast } from "@/components/ui/use-toast";

// Define the structure of an event
export interface Event {
  id: string;
  key: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  price: string;
  category: string;
  emoji: string;
  totalTickets: number;
  status: "active" | "inactive" | "sold_out" | "cancelled";
  thumbnail: string;
  video?: string;
  createdBy?: string;
  createdAt?: string;
}

// Define the structure of a promo code
export interface PromoCode {
  code: string;
  eventId: string;
  discountPercentage: number;
  isActive: boolean;
  ticketLimit: number;
  usedCount: number;
}

// Define the context's shape
interface EventContextType {
  events: Event[];
  loading: boolean;
  error: string | null;
  createEvent: (newEvent: Omit<Event, "id" | "key" | "createdAt" | "createdBy">) => Promise<void>;
  getEvent: (id: string | "all") => Promise<Event | Event[] | null>;
  updateEvent: (id: string, updatedEvent: Partial<Event>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  validatePromo: (eventId: string, code: string) => Promise<PromoCode | null>;
}

// Create the context
const EventContext = createContext<EventContextType | undefined>(undefined);

// EventProvider wraps your app and provides the context
export const EventProvider = ({ children }: { children: ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Mock API call for fetching events
  const fetchEvents = async (): Promise<Event[]> => {
    setLoading(true);
    try {
      // Simulate API call (replace with actual API call in production)
      const response = await new Promise<Event[]>((resolve) =>
        setTimeout(() => resolve(events), 500)
      );
      setEvents(response);
      return response;
    } catch (err) {
      const errorMessage = "Failed to fetch events";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create a new event
  const createEvent = async (newEvent: Omit<Event, "id" | "key" | "createdAt" | "createdBy">) => {
    setLoading(true);
    try {
      const event: Event = {
        ...newEvent,
        id: uuid(),
        key: `event-${uuid().slice(0, 8)}`,
        createdAt: new Date().toISOString(),
        createdBy: "current_user_id", // Replace with actual user ID from AuthContext
      };
      setEvents((prevEvents) => [...prevEvents, event]);
      toast({ title: "Success", description: `${event.title} created successfully` });
    } catch (err) {
      const errorMessage = "Failed to create event";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Get event(s) by ID or all events
  const getEvent = async (id: string | "all"): Promise<Event | Event[] | null> => {
    setLoading(true);
    try {
      if (id === "all") {
        return events;
      }
      const event = events.find((e) => e.id === id);
      if (!event) {
        throw new Error("Event not found");
      }
      return event;
    } catch (err) {
      const errorMessage = "Failed to fetch event";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing event
  const updateEvent = async (id: string, updatedEvent: Partial<Event>) => {
    setLoading(true);
    try {
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === id ? { ...event, ...updatedEvent } : event
        )
      );
      toast({ title: "Success", description: "Event updated successfully" });
    } catch (err) {
      const errorMessage = "Failed to update event";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Delete an event
  const deleteEvent = async (id: string) => {
    setLoading(true);
    try {
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== id));
      toast({ title: "Success", description: "Event deleted successfully" });
    } catch (err) {
      const errorMessage = "Failed to delete event";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Validate promo code
  const validatePromo = async (eventId: string, code: string): Promise<PromoCode | null> => {
    setLoading(true);
    try {
      // Mock promo code validation (replace with actual API call)
      const promo: PromoCode = {
        code: code.toUpperCase(),
        eventId,
        discountPercentage: code === "SAVE10" ? 10 : 20, // Mock logic
        isActive: true,
        ticketLimit: 100,
        usedCount: 0,
      };
      if (promo.code === code.toUpperCase() && promo.eventId === eventId) {
        return promo;
      }
      throw new Error("Invalid promo code");
    } catch (err) {
      const errorMessage = "Invalid or expired promo code";
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <EventContext.Provider
      value={{
        events,
        loading,
        error,
        createEvent,
        getEvent,
        updateEvent,
        deleteEvent,
        validatePromo,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

// Hook to access the event context
export const useEvent = (): EventContextType => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
};