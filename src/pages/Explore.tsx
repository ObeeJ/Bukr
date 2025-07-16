import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/EventCard";
import FlierUpload from "@/components/FlierUpload";
import { Search, Upload } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";
import CreateEventButton from "@/components/CreateEventButton";

const Explore = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Music", "Theater", "Conference", "Sports"];

  const sampleEvents = [
    {
      id: "1",
      title: "Summer Music Festival",
      location: "Central Park, NYC",
      date: "7/15/2025",
      time: "18:00",
      price: 89,
      rating: 4.8,
      attendees: 1250,
      category: "Music",
      status: "trending" as const,
      image: "🎵",
      weather: {
        condition: "sunny" as const,
        temperature: 78,
        description: "Clear skies"
      }
    },
    {
      id: "2",
      title: "Tech Conference 2025",
      location: "Convention Center",
      date: "7/20/2025", 
      time: "09:00",
      price: 150,
      rating: 4.6,
      attendees: 500,
      category: "Conference",
      image: "💻",
      weather: {
        condition: "cloudy" as const,
        temperature: 72,
        description: "Partly cloudy"
      }
    },
    {
      id: "3",
      title: "Broadway Musical",
      location: "Times Square Theater",
      date: "7/8/2025",
      time: "20:00", 
      price: 125,
      rating: 4.9,
      attendees: 200,
      category: "Theater",
      status: "confirmed" as const,
      image: "🎭",
      weather: {
        condition: "rainy" as const,
        temperature: 65,
        description: "Light rain"
      }
    }
  ];

  const filteredEvents = sampleEvents.filter(event => 
    (selectedCategory === "All" || event.category === selectedCategory) &&
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div>
            <AnimatedLogo size="lg" clickable={true} />
            <p className="text-muted-foreground mt-1">Discover amazing events</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <span className="text-sm font-bold">👤</span>
          </div>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search events, locations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 glass-card border-glass-border bg-glass/20 backdrop-blur-sm h-14 text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "glow" : "glass"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="whitespace-nowrap"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Create Event Options */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <CreateEventButton variant="outline" className="h-14" />
        <FlierUpload
          trigger={
            <Button variant="glow" className="h-14">
              <Upload className="w-5 h-5 mr-2" />
              Upload Flier
            </Button>
          }
          onUpload={(file, data) => {
            console.log('Flier uploaded:', file.name, data);
          }}
        />
      </div>

      {/* Events Grid */}
      <div className="space-y-6">
        {filteredEvents.map((event, index) => (
          <div key={event.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <EventCard 
              {...event}
              onBook={() => console.log(`Booking ${event.title}`)}
              onFavoriteToggle={(eventId, isFavorite) => 
                console.log(`${isFavorite ? 'Added to' : 'Removed from'} favorites:`, eventId)
              }
            />
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12 relative">
          <div className="glass-card p-8 max-w-md mx-auto">
            <div className="w-24 h-24 mx-auto mb-4 animate-float">
              <span className="text-6xl">🎭</span>
            </div>
            <h3 className="text-xl font-bold text-glow mb-2">No Events Found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or category filters.</p>
            <Button variant="glow" onClick={() => setSearchQuery("")}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Explore;