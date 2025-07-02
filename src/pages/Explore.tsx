import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Calendar, TrendingUp } from "lucide-react";
import EventCard from "@/components/EventCard";
import CreateEventModal from "@/components/CreateEventModal";
import WeatherWidget from "@/components/WeatherWidget";
import { MotionDiv, MotionH1, MotionP, fadeInUp, scaleIn, staggerContainer, hoverScale } from "@/components/ui/motion";
import { motion } from "framer-motion";

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
    },
    {
      id: "4",
      title: "Food & Wine Festival",
      location: "Brooklyn Bridge Park",
      date: "7/25/2025",
      time: "12:00",
      price: 65,
      rating: 4.7,
      attendees: 800,
      category: "Food",
      image: "🍷"
    }
  ];

  const filteredEvents = sampleEvents.filter(event => 
    (selectedCategory === "All" || event.category === selectedCategory) &&
    event.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      className="min-h-screen pt-8 pb-24 px-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <MotionDiv 
        className="flex items-center justify-between mb-8"
        variants={fadeInUp}
      >
        <div>
          <MotionH1 
            className="text-4xl font-bold text-glow text-display"
            variants={scaleIn}
          >
            Bukr
          </MotionH1>
          <MotionP 
            className="text-muted-foreground mt-1 text-body"
            variants={fadeInUp}
          >
            Discover amazing events
          </MotionP>
        </div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center backdrop-blur-xl">
              <span className="text-base font-bold">👤</span>
            </div>
          </Button>
        </motion.div>
      </MotionDiv>

      {/* Weather Widget */}
      <MotionDiv 
        className="mb-8"
        variants={fadeInUp}
      >
        <WeatherWidget date="Today" location="New York" />
      </MotionDiv>

      {/* Search and Filter */}
      <MotionDiv 
        className="flex gap-4 mb-6"
        variants={fadeInUp}
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            type="text"
            placeholder="Search events..."
            className="pl-12 glass-card border-glass-border/40 text-body placeholder:text-body"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="glass" size="icon" className="hover-glow">
          <Filter className="w-5 h-5" />
        </Button>
      </MotionDiv>

      {/* Categories */}
      <MotionDiv 
        className="flex gap-3 mb-8 overflow-x-auto pb-2"
        variants={fadeInUp}
      >
        {categories.map((category) => (
          <motion.div key={category} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Badge
              variant={selectedCategory === category ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap transition-all duration-300 text-caption px-4 py-2 ${
                selectedCategory === category 
                  ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" 
                  : "hover:bg-primary/10 hover:border-primary/40"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Badge>
          </motion.div>
        ))}
      </MotionDiv>

      {/* Featured Events Header */}
      <MotionDiv 
        className="flex items-center justify-between mb-6"
        variants={fadeInUp}
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-display">Featured Events</h2>
        </div>
        <CreateEventModal
          trigger={
            <Button variant="glow" size="lg" className="gap-3">
              <Calendar className="w-5 h-5" />
              Create Event
            </Button>
          }
        />
      </MotionDiv>

      {/* Events Grid */}
      <MotionDiv 
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        variants={staggerContainer}
      >
        {filteredEvents.map((event, index) => (
          <motion.div 
            key={event.id} 
            variants={fadeInUp}
            custom={index}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
          >
            <EventCard 
              {...event}
              onBook={() => console.log(`Booking ${event.title}`)}
            />
          </motion.div>
        ))}
      </MotionDiv>

      {filteredEvents.length === 0 && (
        <MotionDiv 
          className="text-center py-12"
          variants={fadeInUp}
        >
          <MotionP className="text-muted-foreground text-body">
            No events found matching your criteria.
          </MotionP>
        </MotionDiv>
      )}
    </motion.div>
  );
};

export default Explore;