import { useEffect, useState } from "react"
import { getAllEvents } from "@/lib/actions/event.actions"
import { EventType } from "@/types"
import EventCard from "@/components/shared/EventCard"
import Empty from "@/components/shared/Empty"
import EventModal from "@/components/modals/EventModal"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Loader from "@/components/shared/Loader"

const Explore = () => {
  const { user } = useUser()
  const [events, setEvents] = useState<EventType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const allEvents = await getAllEvents()
      setEvents(allEvents || [])
    } catch (error) {
      console.error("Failed to fetch events:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const isOrganizer = user?.publicMetadata?.role === "organizer"

  return (
    <main className="px-6 py-8 md:px-12 w-full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Explore Events</h1>
        {isOrganizer && (
          <Button onClick={() => setModalOpen(true)} className="gap-2">
            <Plus size={18} />
            Add Event
          </Button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : events.length === 0 ? (
        <Empty
          title="No Events Found"
          description="Events will appear here once published."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}

      {/* Modal for creating/editing event */}
      {isOrganizer && (
        <EventModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            fetchEvents()
            setModalOpen(false)
          }}
        />
      )}
    </main>
  )
}

export default Explore
