// ============================================================================
// EVENTS PAGE - THE EVENT MARKETPLACE
// ============================================================================
// Layer 1: PRESENTATION - Event listing and management interface
//
// ARCHITECTURE ROLE:
// - Displays all events in the system (public marketplace)
// - Organizers can create/edit events (role-based features)
// - Regular users can browse and view events
// - Modal-based CRUD operations (Create, Read, Update, Delete)
//
// REACT PATTERNS:
// 1. useEffect Hook: Side effects (API calls) after component mounts
//    Runs AFTER first render, perfect for data fetching
// 2. useState Hook: Local state for events array, loading, selected event
// 3. useUser Hook: Custom hook for user context (role checking)
// 4. Conditional Rendering: Show "Create Event" button only for organizers
//
// DATA FLOW:
// Mount -> useEffect triggers -> fetchEvents() -> API call -> setState -> Re-render
//
// STATE MANAGEMENT:
// - events: Array of event objects from API
// - loading: Boolean for loading state (prevents flash of empty state)
// - selectedEvent: Currently selected event for editing (null = create new)
// - open: Modal visibility state
//
// WHY MODAL PATTERN:
// - No page navigation = faster UX
// - Maintains context (user doesn't lose scroll position)
// - Easier state management (modal state is local, not in router)
// ============================================================================

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { EventModal } from "@/components/modals/EventModal";
import { EventCard } from "@/components/cards/EventCard";
import { Empty } from "@/components/Empty";
import { getAllEvents } from "@/api/events";
import { EventType } from "@/types";

const Events = () => {
  // CONTEXT CONSUMPTION - Get current user for role-based rendering
  const { user } = useUser();
  
  // STATE MANAGEMENT - The three pillars of list management
  const [events, setEvents] = useState<EventType[]>([]); // The data
  const [loading, setLoading] = useState(true); // The loading state
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null); // The selected item
  const [open, setOpen] = useState(false); // The modal state

  // DATA FETCHING FUNCTION - Separated for reusability
  // Called on mount AND after successful create/edit
  const fetchEvents = async () => {
    try {
      setLoading(true); // Show loading state
      const data = await getAllEvents(); // API call to Go gateway
      setEvents(data); // Update state with fresh data
    } catch (error) {
      console.error("Failed to fetch events", error);
      // In production, you'd show a toast notification here
    } finally {
      setLoading(false); // Hide loading state (runs whether success or error)
    }
  };

  // SIDE EFFECT - Fetch events when component mounts
  // Empty dependency array [] means "run once on mount"
  // Like componentDidMount in class components, but cleaner
  useEffect(() => {
    fetchEvents();
  }, []); // Empty deps = run once

  // EVENT HANDLERS - User interactions
  const handleEdit = (event: EventType) => {
    setSelectedEvent(event); // Set the event to edit
    setOpen(true); // Open modal
  };

  const handleCreate = () => {
    setSelectedEvent(null); // null = create mode (not edit mode)
    setOpen(true); // Open modal
  };

  const handleSuccess = () => {
    setOpen(false); // Close modal
    fetchEvents(); // Refetch to show updated data (optimistic UI would be faster)
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 safe-area-pb">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Events</h1>
        {user?.userType === "organizer" && (
          <Button 
            onClick={handleCreate}
            className="w-full sm:w-auto h-11 touch-target"
            variant="glow"
          >
            Create Event
          </Button>
        )}
      </div>

      {/* CONDITIONAL RENDERING - Three states: loading, empty, data */}
      {/* This is the standard pattern for async data display */}
      {loading ? (
        // STATE 1: LOADING - Show skeleton or spinner
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        // STATE 2: EMPTY - No data, show empty state with CTA
        <Empty message="No events yet. Be the first to create one!" />
      ) : (
        // STATE 3: DATA - Show the goods
        // Grid layout: Responsive columns (1 mobile, 2 tablet, 3 desktop)
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* ARRAY MAPPING - React's bread and butter */}
          {/* Each item needs a unique "key" prop for React's reconciliation */}
          {events.map((event) => (
            <EventCard key={event.id} event={event} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* EVENT MODAL - Handles both create and edit */}
      {/* initialData prop: null = create, object = edit */}
      {/* This is the "controlled component" pattern */}
      <EventModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={handleSuccess}
        initialData={selectedEvent}
      />
    </div>
  );
};

export default Events;
