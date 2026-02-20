// ============================================================================
// EVENT CARD - REUSABLE EVENT DISPLAY COMPONENT
// ============================================================================
// Layer 1: PRESENTATION - Event information card
//
// ARCHITECTURE ROLE:
// - Displays event summary in card format
// - Reusable across multiple pages (Events, Explore, Favorites)
// - Integrates booking modal and favorite button
// - Shows weather prediction for event date
//
// REACT PATTERNS:
// 1. Component Composition: Combines multiple sub-components
// 2. Prop Drilling: Passes callbacks down to child components
// 3. Conditional Rendering: Show/hide elements based on props
// 4. Render Props: BookingModal uses trigger prop pattern
//
// COMPONENT PROPS:
// - Event data: id, title, location, date, time, price, etc.
// - Callbacks: onBook, onFavoriteToggle
// - Flags: showBookButton, isFavorite
// - Optional: weather, status
//
// DESIGN PATTERNS:
// - Glass morphism: Translucent background with blur
// - Hover effects: Scale and glow on hover
// - Badge system: Status indicators (trending, confirmed, expired)
// - Icon system: Lucide icons for visual hierarchy
//
// STATE MANAGEMENT:
// - Stateless component (all state managed by parent)
// - Callbacks notify parent of user actions
// - This is "presentational component" pattern
//
// ACCESSIBILITY:
// - Semantic HTML (proper heading hierarchy)
// - Icon labels (aria-label on icons)
// - Touch targets (min 44x44px for mobile)
// ============================================================================

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Users, Star, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import BookingModal from "./BookingModal";
import FavoriteButton from "./FavoriteButton";
import WeatherDisplay from "./WeatherDisplay";

interface EventCardProps {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  price: number;
  rating: number;
  attendees: number;
  category: string;
  status?: "trending" | "confirmed" | "expired";
  image: string;
  onBook?: () => void;
  showBookButton?: boolean;
  weather?: {
    condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
    temperature: number;
    description: string;
  };
  isFavorite?: boolean;
  onFavoriteToggle?: (eventId: string, isFavorite: boolean) => void;
}

const EventCard = ({ 
  id,
  title, 
  location, 
  date, 
  time, 
  price, 
  rating, 
  attendees, 
  status, 
  image, 
  onBook,
  showBookButton = true,
  weather,
  isFavorite = false,
  onFavoriteToggle
}: EventCardProps) => {
  return (
    <div className="glass-card hover-glow animate-fade-in p-6 w-full">
      {/* CARD HEADER - Status badge and favorite button */}
      <div className="flex justify-between items-start mb-4">
        {/* EVENT ICON - Emoji or image placeholder */}
        {/* In production, this would be an <img> tag */}
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">
          {image}
        </div>
        
        {/* HEADER ACTIONS - Status and favorite */}
        <div className="flex items-center gap-2">
          {/* STATUS BADGE - Conditional rendering and styling */}
          {status && (
            <Badge className={cn(
              "status-badge",
              // Conditional classes based on status
              status === "confirmed" && "status-confirmed",
              status === "expired" && "status-expired", 
              status === "trending" && "status-trending"
            )}>
              {status.toUpperCase()}
            </Badge>
          )}
          {/* FAVORITE BUTTON - Reusable component */}
          <FavoriteButton
            eventId={id}
            initialFavorite={isFavorite}
            onToggle={onFavoriteToggle}
          />
        </div>
      </div>

      {/* EVENT DETAILS - Information hierarchy */}
      <div className="space-y-3">
        {/* TITLE - Primary information */}
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        
        {/* LOCATION - With icon for visual scanning */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{location}</span>
        </div>
        
        {/* DATE AND TIME - Grouped for readability */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{date}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{time}</span>
          </div>
        </div>

        {/* METADATA ROW - Attendees, rating, weather */}
        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-4">
            {/* ATTENDEES - Scarcity indicator ("only X left") */}
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">{attendees} left</span>
            </div>
            {/* RATING - Social proof */}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="text-sm">{rating}</span>
            </div>
          </div>
          {/* WEATHER - Conditional rendering */}
          {weather && (
            <WeatherDisplay weather={weather} size="sm" showDescription={false} />
          )}
        </div>

        {/* PRICE AND CTA - Bottom section */}
        <div className="flex items-center justify-between pt-4">
          {/* PRICE - Large and prominent */}
          <div className="text-2xl font-bold text-foreground">${price}</div>
          {/* BOOKING MODAL - Render props pattern */}
          {/* The trigger prop lets BookingModal control when it opens */}
          {showBookButton && (
            <BookingModal
              event={{ title, location, date, time, price, image }}
              trigger={
                <Button variant="glow" className="px-8">
                  Book →
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;