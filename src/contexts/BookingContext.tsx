import React, { createContext, useContext, useState } from 'react';

type EventType = {
  id?: string;
  title?: string;
  date?: string;
  time?: string;
  price?: string;
  emoji?: string;
  key?: string;
};

interface BookingContextType {
  openBooking: (event: EventType) => void;
  closeBooking: () => void;
  isBookingOpen: boolean;
  selectedEvent: EventType | null;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);

  const openBooking = (event: EventType) => {
    setSelectedEvent(event);
    setIsBookingOpen(true);
  };

  const closeBooking = () => {
    setIsBookingOpen(false);
    setSelectedEvent(null);
  };

  return (
    <BookingContext.Provider value={{ 
      openBooking, 
      closeBooking, 
      isBookingOpen, 
      selectedEvent 
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};