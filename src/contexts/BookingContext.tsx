import React, { createContext, useContext, useState } from 'react';
import BookingFlow from '@/components/BookingFlow';

interface BookingContextType {
  openBooking: (event: any) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const openBooking = (event: any) => {
    setSelectedEvent(event);
    setIsBookingOpen(true);
  };

  const closeBooking = () => {
    setIsBookingOpen(false);
  };

  return (
    <BookingContext.Provider value={{ openBooking }}>
      {children}
      {selectedEvent && (
        <BookingFlow 
          isOpen={isBookingOpen} 
          onClose={closeBooking} 
          event={selectedEvent} 
        />
      )}
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