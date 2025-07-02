import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/EventCard";
import CreateEventModal from "@/components/CreateEventModal";
import { Search, Plus } from "lucide-react";

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
      image: "🎵"
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
      image: "💻"
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
      image: "🎭"
    }
  ];

  const filteredEvents = sampleEvents.filter(event => 
    (selectedCategory === "All" || event.category === selectedCategory) &&
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-glow">Bukr</h1>
          <p className="text-muted-foreground mt-1">Discover amazing events</p>
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

      {/* Create Event Button */}
      <CreateEventModal
        trigger={
          <Button variant="outline" className="w-full mb-6 h-14">
            <Plus className="w-5 h-5 mr-2" />
            Create New Event
          </Button>
        }
      />

      {/* Events Grid */}
      <div className="space-y-6">
        {filteredEvents.map((event, index) => (
          <div key={event.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
            <EventCard 
              {...event}
              onBook={() => console.log(`Booking ${event.title}`)}
            />
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No events found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Explore;