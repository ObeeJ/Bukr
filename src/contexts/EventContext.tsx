import React, { createContext, useContext, useState } from 'react';

interface Event {
  id: string;
  name: string;
  totalTickets: number;
  scannedTickets: number;
  revenue: number;
  thumbnailUrl?: string;
  videoUrl?: string;
}

interface EventContextType {
  events: Event[];
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  isOrganizer: boolean;
  addEvent: (event: Event) => void;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      name: 'Sample Event',
      totalTickets: 100,
      scannedTickets: 25,
      revenue: 50000,
    }
  ]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(events[0]);
  const isOrganizer = true; // Mock for prototype

  const addEvent = (event: Event) => {
    setEvents(prev => [...prev, event]);
  };

  return (
    <EventContext.Provider value={{ 
      events, 
      selectedEvent, 
      setSelectedEvent, 
      isOrganizer,
      addEvent 
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