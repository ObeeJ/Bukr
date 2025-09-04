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
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        {user?.role === "organizer" && (
          <Button onClick={handleCreate}>Create Event</Button>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <Empty message="No events yet. Be the first to create one!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
