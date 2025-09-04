import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

interface BookingContextType {
  bookNow: (event: any) => void;
  bookings: any[];
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const [bookings, setBookings] = useState<any[]>([]);

  const bookNow = (event: any) => {
    console.log('Booking event:', event);
    setBookings(prev => [...prev, { ...event, bookedAt: new Date() }]);
    toast.success(`Successfully booked: ${event.title || 'Event'}`);
  };

  return (
    <BookingContext.Provider value={{ bookNow, bookings }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};