import { Heart } from "lucide-react";
import EventCard from "@/components/EventCard";

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
    <div className="min-h-screen pt-8 pb-24 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center">
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
        <div className="text-center py-12">
          <p className="text-muted-foreground">No favorite events yet.</p>
          <p className="text-muted-foreground text-sm mt-2">Tap the heart icon on events to save them here.</p>
        </div>
      )}
    </div>
  );
};

export default Favorites;