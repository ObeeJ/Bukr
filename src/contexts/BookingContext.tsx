/**
 * PRESENTATION LAYER - Booking Context
 * 
 * BookingContext: The booking manager - handling event bookings
 * 
 * Architecture Layer: Presentation (Layer 1)
 * Responsibility: Simple booking state management
 * 
 * Note: This is a simplified booking context
 * Real booking flow uses TicketContext for actual purchases
 */

import React, { createContext, useContext, useState } from 'react';
import { toast } from 'sonner';

interface BookingContextType {
  bookNow: (event: any) => void;    // Quick booking action
  bookings: any[];                   // Booked events
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const [bookings, setBookings] = useState<any[]>([]);

  /**
   * Quick book action
   * Adds event to bookings and shows success toast
   */
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