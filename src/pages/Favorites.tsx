import { Heart } from "lucide-react";
import EventCard from "@/components/EventCard";
import EmptyState from "@/components/EmptyState";

const Favorites = () => {
  const favoriteEvents = [
    {
      id: "1",
      title: "Jazz Night Live",
      location: "Blue Note, NYC",
      date: "8/5/2025",
      time: "21:00",
      price: 65,
      rating: 4.7,
      attendees: 300,
      category: "Music",
      image: "🎷",
      weather: {
        condition: "cloudy" as const,
        temperature: 70,
        description: "Overcast"
      }
    },
    {
      id: "2",
      title: "Modern Art Showcase",
      location: "Whitney Museum",
      date: "8/12/2025",
      time: "19:00",
      price: 35,
      rating: 4.5,
      attendees: 150,
      category: "Art",
      image: "🖼️",
      weather: {
        condition: "sunny" as const,
        temperature: 75,
        description: "Clear skies"
      }
    }
  ];

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 relative">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center animate-float">
          <Heart className="w-8 h-8 text-primary fill-primary" />
        </div>
        <h1 className="text-3xl font-bold text-glow mb-2">Favorites</h1>
        <p className="text-muted-foreground">Events you've saved for later</p>
      </div>

      {/* Favorites List */}
      <div className="space-y-6">
        {favoriteEvents.map((event, index) => (
          <div key={event.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <EventCard 
              {...event}
              isFavorite={true}
              onBook={() => console.log(`Booking ${event.title}`)}
              onFavoriteToggle={(eventId, isFavorite) => {
                if (!isFavorite) {
                  console.log(`Removed ${eventId} from favorites`);
                  // In real app, this would remove from favorites list
                }
              }}
            />
          </div>
        ))}
      </div>

      {favoriteEvents.length === 0 && (
        <EmptyState
          title="No Favorites Yet"
          description="Tap the heart icon on any event to save it here for quick access later."
          icon="💝"
          action={{
            label: "Explore Events",
            onClick: () => window.location.href = "/"
          }}
        />
      )}
    </div>
  );
};

export default Favorites;