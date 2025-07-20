import React, { createContext, useContext, useState, ReactNode } from 'react';
import { v4 as uuid } from 'uuid';

// Define types
export interface Event {
  id: string;
  key?: string;
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  price: string;
  category: string;
  emoji: string;
  totalTickets: number;
  soldTickets: number;
  revenue: string;
  status: 'active' | 'completed' | 'cancelled';
  image?: string;
}

export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  discountPercentage: number;
  ticketLimit: number;
  usedCount: number;
  isActive: boolean;
}

interface EventContextType {
  events: Event[];
  promoCodes: PromoCode[];
  createEvent: (event: Omit<Event, 'id' | 'key'>) => string;
  updateEvent: (id: string, event: Partial<Event>) => void;
  getEvent: (id: string) => Event | undefined;
  deleteEvent: (id: string) => void;
  addPromo: (eventId: string, promo: Omit<PromoCode, 'id' | 'eventId' | 'usedCount' | 'isActive'>) => string;
  getPromos: (eventId: string) => PromoCode[];
  validatePromo: (eventId: string, code: string) => PromoCode | null;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Mock initial data
  const [events, setEvents] = useState<Event[]>([
    {
      id: "101",
      key: uuid(),
      title: "Tech Conference 2023",
      description: "Join industry leaders and innovators for the biggest tech conference of the year.",
      location: "Convention Center, SF",
      date: "8/20/2023",
      time: "9:00 AM",
      price: "$150",
      category: "tech",
      emoji: "💻",
      totalTickets: 1000,
      soldTickets: 850,
      revenue: "$127,500",
      status: "active"
    },
    {
      id: "102",
      key: uuid(),
      title: "Music Festival",
      description: "Experience the ultimate summer music festival featuring top artists.",
      location: "Central Park, NY",
      date: "7/15/2023",
      time: "6:00 PM",
      price: "$50",
      category: "music",
      emoji: "🎵",
      totalTickets: 2000,
      soldTickets: 1250,
      revenue: "$62,500",
      status: "active"
    }
  ]);

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([
    {
      id: '1',
      eventId: '101',
      code: 'WELCOME10',
      discountPercentage: 10,
      ticketLimit: 50,
      usedCount: 12,
      isActive: true
    },
    {
      id: '2',
      eventId: '102',
      code: 'EARLYBIRD20',
      discountPercentage: 20,
      ticketLimit: 20,
      usedCount: 20,
      isActive: false
    }
  ]);

  const createEvent = (eventData: Omit<Event, 'id' | 'key'>) => {
    const id = uuid();
    const key = uuid();
    const newEvent = { 
      ...eventData, 
      id, 
      key,
      soldTickets: 0,
      revenue: "$0"
    };
    
    setEvents(prev => [...prev, newEvent]);
    return id;
  };

  const updateEvent = (id: string, eventData: Partial<Event>) => {
    setEvents(prev => 
      prev.map(event => 
        event.id === id ? { ...event, ...eventData } : event
      )
    );
  };

  const getEvent = (id: string) => {
    return events.find(event => event.id === id);
  };

  const deleteEvent = (id: string) => {
    setEvents(prev => prev.filter(event => event.id !== id));
  };

  const addPromo = (eventId: string, promoData: Omit<PromoCode, 'id' | 'eventId' | 'usedCount' | 'isActive'>) => {
    const id = uuid();
    const newPromo = {
      ...promoData,
      id,
      eventId,
      usedCount: 0,
      isActive: true
    };
    
    setPromoCodes(prev => [...prev, newPromo]);
    return id;
  };

  const getPromos = (eventId: string) => {
    return promoCodes.filter(promo => promo.eventId === eventId);
  };

  const validatePromo = (eventId: string, code: string) => {
    const promo = promoCodes.find(
      p => p.eventId === eventId && 
           p.code === code && 
           p.isActive && 
           p.usedCount < p.ticketLimit
    );
    
    return promo || null;
  };

  return (
    <EventContext.Provider value={{
      events,
      promoCodes,
      createEvent,
      updateEvent,
      getEvent,
      deleteEvent,
      addPromo,
      getPromos,
      validatePromo
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return context;
};