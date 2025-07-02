import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, DollarSign, Users, Video, Wifi } from "lucide-react";
import WeatherDisplay, { getWeatherPrediction } from "./WeatherDisplay";

interface CreateEventModalProps {
  trigger: React.ReactNode;
}

const CreateEventModal = ({ trigger }: CreateEventModalProps) => {
  const [eventType, setEventType] = useState<"physical" | "virtual" | "hybrid">("physical");
  const [weatherPrediction, setWeatherPrediction] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    date: "",
    time: "",
    location: "",
    virtualLink: "",
    price: "",
    capacity: "",
    requiresSeats: false
  });

  const handleDateTimeChange = async (field: "date" | "time", value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Fetch weather prediction if we have both date and time for physical/hybrid events
    if (eventType !== "virtual" && newFormData.date && newFormData.time && newFormData.location) {
      setLoadingWeather(true);
      try {
        const weather = await getWeatherPrediction(newFormData.date, newFormData.location);
        setWeatherPrediction(weather);
      } catch (error) {
        console.error("Failed to fetch weather:", error);
      } finally {
        setLoadingWeather(false);
      }
    }
  };

  const categories = ["Music", "Theater", "Conference", "Sports", "Art", "Food", "Other"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating event:", { ...formData, eventType, weatherPrediction });
    // In real app, this would make an API call
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">Create New Event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Event Type Selection */}
          <div className="space-y-3">
            <Label className="text-foreground">Event Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "physical", icon: MapPin, label: "Physical" },
                { value: "virtual", icon: Video, label: "Virtual" },
                { value: "hybrid", icon: Wifi, label: "Hybrid" }
              ].map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={eventType === value ? "glow" : "outline"}
                  className="flex flex-col h-16 gap-1"
                  onClick={() => setEventType(value as any)}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            {eventType === "hybrid" && (
              <p className="text-xs text-muted-foreground">
                Hybrid events have both physical and virtual attendance options
              </p>
            )}
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-foreground">Event Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Enter event title"
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your event"
                className="glass-card border-glass-border bg-glass/20 min-h-[80px]"
                required
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-foreground">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger className="glass-card border-glass-border bg-glass/20">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="glass-card border-glass-border">
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date" className="text-foreground">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleDateTimeChange("date", e.target.value)}
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
            <div>
              <Label htmlFor="time" className="text-foreground">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleDateTimeChange("time", e.target.value)}
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
          </div>

          {/* Weather Prediction */}
          {eventType !== "virtual" && weatherPrediction && (
            <div className="glass-card p-4 space-y-2">
              <Label className="text-foreground">Weather Forecast</Label>
              <WeatherDisplay weather={weatherPrediction} size="md" />
            </div>
          )}
          
          {loadingWeather && eventType !== "virtual" && (
            <div className="glass-card p-4 animate-pulse">
              <p className="text-sm text-muted-foreground">Loading weather forecast...</p>
            </div>
          )}

          {/* Location and/or Virtual Link */}
          {eventType !== "virtual" && (
            <div>
              <Label htmlFor="location" className="text-foreground">Venue Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="Enter venue address"
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
          )}
          
          {eventType !== "physical" && (
            <div>
              <Label htmlFor="virtualLink" className="text-foreground">
                {eventType === "hybrid" ? "Live Stream Link" : "Virtual Meeting Link"}
              </Label>
              <Input
                id="virtualLink"
                value={formData.virtualLink}
                onChange={(e) => setFormData({...formData, virtualLink: e.target.value})}
                placeholder="https://zoom.us/j/..."
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
          )}

          {/* Pricing and Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="text-foreground">Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
                placeholder="0"
                min="0"
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
            <div>
              <Label htmlFor="capacity" className="text-foreground">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                placeholder="100"
                min="1"
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
          </div>

          {/* Seat Selection Option for Physical Events */}
          {eventType !== "virtual" && (
            <div className="flex items-center justify-between glass-card p-4">
              <div>
                <Label className="text-foreground">Requires Seat Selection</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Enable if guests need to choose specific seats
                </p>
              </div>
              <Switch
                checked={formData.requiresSeats}
                onCheckedChange={(checked) => setFormData({...formData, requiresSeats: checked})}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="glow" className="flex-1">
              Create {eventType.charAt(0).toUpperCase() + eventType.slice(1)} Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventModal;