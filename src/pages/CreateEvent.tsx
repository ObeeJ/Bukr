import React, { useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import { EventContext } from "@/context/EventContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

const CreateEvent = () => {
  const navigate = useNavigate();
  const { events, setEvents } = useContext(EventContext);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    location: "",
    type: "physical", // physical | virtual | hybrid
    date: "",
    time: "",
    category: "",
    totalSeats: 0,
    availableSeats: 0,
    price: 0,
    organizer: "You",
    isInfluencerEvent: false,
    influencerHandles: {
      twitter: "",
      instagram: "",
      tiktok: "",
      snapchat: "",
      facebook: ""
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalSeats" || name === "price" ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Influencer validation
    if (formData.isInfluencerEvent) {
      const filledHandles = Object.values(formData.influencerHandles).filter(Boolean);
      if (filledHandles.length < 2) {
        toast({
          title: "Add More Socials",
          description: "Please provide at least two social media handles.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }
    }

    const eventId = uuidv4();
    const newEvent = {
      ...formData,
      id: eventId,
      availableSeats: formData.totalSeats
    };

    setEvents([newEvent, ...events]);

    toast({
      title: "Event Created 🎉",
      description: `${formData.name} has been added.`,
    });

    setTimeout(() => {
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 mt-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Create a New Event</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Event Name</Label>
          <Input name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div>
          <Label>Description</Label>
          <Textarea name="description" value={formData.description} onChange={handleChange} required />
        </div>

        <div>
          <Label>Location</Label>
          <Input name="location" value={formData.location} onChange={handleChange} required />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label>Date</Label>
            <Input name="date" type="date" value={formData.date} onChange={handleChange} required />
          </div>
          <div>
            <Label>Time</Label>
            <Input name="time" type="time" value={formData.time} onChange={handleChange} required />
          </div>
          <div>
            <Label>Category</Label>
            <Input name="category" value={formData.category} onChange={handleChange} required />
          </div>
        </div>

        <div>
          <Label>Event Type</Label>
          <select
            name="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 w-full"
          >
            <option value="physical">Physical</option>
            <option value="virtual">Virtual</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {formData.type === "physical" || formData.type === "hybrid" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Total Seats</Label>
              <Input
                name="totalSeats"
                type="number"
                min={1}
                value={formData.totalSeats}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Price (₦)</Label>
              <Input
                name="price"
                type="number"
                min={0}
                value={formData.price}
                onChange={handleChange}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2 mt-6">
          <Label>
            <input
              type="checkbox"
              checked={formData.isInfluencerEvent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isInfluencerEvent: e.target.checked
                }))
              }
            />{" "}
            Enable Influencer Applications
          </Label>

          {formData.isInfluencerEvent && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {["twitter", "instagram", "tiktok", "snapchat", "facebook"].map((platform) => (
                <div key={platform}>
                  <Label htmlFor={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)} Handle
                  </Label>
                  <Input
                    id={platform}
                    name={platform}
                    value={formData.influencerHandles[platform as keyof typeof formData.influencerHandles]}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        influencerHandles: {
                          ...prev.influencerHandles,
                          [platform]: e.target.value
                        }
                      }))
                    }
                    placeholder={`@your${platform}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Create Event"}
        </Button>
      </form>
    </div>
  );
};

export default CreateEvent;
