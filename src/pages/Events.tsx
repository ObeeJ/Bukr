import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/useUser";
import { EventModal } from "@/components/modals/EventModal";
import { EventCard } from "@/components/cards/EventCard";
import { Empty } from "@/components/Empty";
import { getAllEvents } from "@/api/events";
import { EventType } from "@/types";

const Events = () => {
  const { user } = useUser();
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [open, setOpen] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getAllEvents();
      setEvents(data);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleEdit = (event: EventType) => {
    setSelectedEvent(event);
    setOpen(true);
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setOpen(true);
  };

  const handleSuccess = () => {
    setOpen(false);
    fetchEvents(); // Refetch list after creating or editing
  };

  return (
    <div className="max-w-5xl mx-auto py-4 sm:py-6 lg:py-8 px-3 sm:px-4 safe-area-pb">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Events</h1>
        {user?.role === "organizer" && (
          <Button 
            onClick={handleCreate}
            className="w-full sm:w-auto h-11 touch-target"
            variant="glow"
          >
            Create Event
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <Empty message="No events yet. Be the first to create one!" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onEdit={handleEdit} />
          ))}
        </div>
      )}

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
