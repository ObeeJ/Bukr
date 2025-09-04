import React, { createContext, useContext, useState } from 'react';

interface BookingContextType {
  bookNow: (event: any) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider = ({ children }: { children: React.ReactNode }) => {
  const bookNow = (event: any) => {
    console.log('Booking event:', event);
    // Add booking logic here
  };

  return (
    <BookingContext.Provider value={{ bookNow }}>
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