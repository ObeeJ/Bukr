import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, MapPin, DollarSign, Users, Video } from "lucide-react";

interface CreateEventModalProps {
  trigger: React.ReactNode;
}

const CreateEventModal = ({ trigger }: CreateEventModalProps) => {
  const [isVirtual, setIsVirtual] = useState(false);
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

  const categories = ["Music", "Theater", "Conference", "Sports", "Art", "Food", "Other"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Creating event:", { ...formData, isVirtual });
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
          {/* Event Type Toggle */}
          <div className="space-y-3">
            <Label className="text-foreground">Event Type</Label>
            <div className="flex items-center gap-4 glass-card p-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Physical</span>
              </div>
              <Switch
                checked={isVirtual}
                onCheckedChange={setIsVirtual}
              />
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Virtual</span>
              </div>
            </div>
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
                onChange={(e) => setFormData({...formData, date: e.target.value})}
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
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
          </div>

          {/* Location or Virtual Link */}
          {isVirtual ? (
            <div>
              <Label htmlFor="virtualLink" className="text-foreground">Virtual Meeting Link</Label>
              <Input
                id="virtualLink"
                value={formData.virtualLink}
                onChange={(e) => setFormData({...formData, virtualLink: e.target.value})}
                placeholder="https://zoom.us/j/..."
                className="glass-card border-glass-border bg-glass/20"
                required
              />
            </div>
          ) : (
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
          {!isVirtual && (
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
              Create Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateEventModal;