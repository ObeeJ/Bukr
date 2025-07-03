import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, MapPin, DollarSign, Upload } from "lucide-react";
import FlierUpload from "@/components/FlierUpload";
import { useToast } from "@/hooks/use-toast";

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    price: "",
    category: "General"
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Event Created!",
      description: "Your event has been successfully created and is pending review.",
    });
    console.log("Creating event:", formData);
  };

  const handleFlierUpload = (file: File, extractedData: any) => {
    setFormData({
      ...formData,
      title: extractedData.title || formData.title,
      date: extractedData.date || formData.date,
      time: extractedData.time || formData.time,
      location: extractedData.location || formData.location,
      price: extractedData.price || formData.price,
    });
    toast({
      title: "Flier Processed!",
      description: "Event details have been extracted from your flier.",
    });
  };

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-glow mb-2">Create Event</h1>
          <p className="text-muted-foreground">Share your amazing event with the world</p>
        </div>

        {/* Flier Upload Section */}
        <Card className="glass-card border-glass-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Upload className="w-5 h-5 text-primary" />
              Quick Upload from Flier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Have an existing event flier? Upload it and we'll extract the details automatically.
            </p>
            <FlierUpload
              trigger={
                <Button variant="outline" className="w-full">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Event Flier
                </Button>
              }
              onUpload={handleFlierUpload}
            />
          </CardContent>
        </Card>

        {/* Manual Form */}
        <Card className="glass-card border-glass-border">
          <CardHeader>
            <CardTitle className="text-foreground">Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="title">Event Title</Label>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe your event"
                  className="glass-card border-glass-border bg-glass/20"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date" className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Date
                  </Label>
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
                  <Label htmlFor="time">Time</Label>
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

              <div>
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Event location"
                  className="glass-card border-glass-border bg-glass/20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="price" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="0"
                  className="glass-card border-glass-border bg-glass/20"
                  required
                />
              </div>

              <Button type="submit" className="w-full" variant="glow" size="lg">
                Create Event
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateEvent;