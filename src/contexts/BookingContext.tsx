// src/contexts/BookingContext.tsx

import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Event } from "@/types";

interface BookingContextType {
  openBooking: (event: Event) => void;
  closeBooking: () => void;
  isBookingOpen: boolean;
  selectedEvent: Event | null;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const navigate = useNavigate();

  const openBooking = (event: Event) => {
    if (!event.key) {
      console.warn("Event key is missing for booking");
      return;
    }
    setSelectedEvent(event);
    setIsBookingOpen(true);
    navigate(`/purchase/${event.key}`);
  };

  const closeBooking = () => {
    setIsBookingOpen(false);
    setSelectedEvent(null);
    navigate(-1); // Navigate back to previous page
  };

  return (
    <BookingContext.Provider
      value={{
        openBooking,
        closeBooking,
        isBookingOpen,
        selectedEvent,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = (): BookingContextType => {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
};