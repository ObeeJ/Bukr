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
      {/* Header with status badge and favorite button */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl">
          {image}
        </div>
        <div className="flex items-start gap-2">
          <FavoriteButton
            eventId={id}
            initialFavorite={isFavorite}
            onToggle={onFavoriteToggle}
          />
          {status && (
            <Badge className={cn(
              "status-badge",
              status === "confirmed" && "status-confirmed",
              status === "expired" && "status-expired", 
              status === "trending" && "status-trending"
            )}>
              {status.toUpperCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* Event Details */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{location}</span>
        </div>
        
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

        <div className="flex items-center justify-between text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm">{attendees} left</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <span className="text-sm">{rating}</span>
            </div>
          </div>
          {weather && (
            <WeatherDisplay weather={weather} size="sm" showDescription={false} />
          )}
        </div>

        {/* Price and Book Button */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-2xl font-bold text-foreground">${price}</div>
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