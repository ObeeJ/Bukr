import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { v4 as uuid } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import AnimatedLogo from '@/components/AnimatedLogo';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { createEvent, updateEvent, getEvent } = useEvent();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    time: '',
    price: '',
    category: 'music',
    emoji: '🎵',
    totalTickets: 100,
    eventType: 'physical' as 'physical' | 'virtual' | 'hybrid',
    maxCapacity: 100,
    sections: [{ name: 'General', rows: 10, seatsPerRow: 10, price: 50 }]
  });

  useEffect(() => {
    // Check if we're in edit mode
    if (id) {
      const eventToEdit = getEvent(id);
      if (eventToEdit) {
        setIsEditMode(true);
        setFormData({
          title: eventToEdit.title,
          description: eventToEdit.description || '',
          location: eventToEdit.location,
          date: eventToEdit.date,
          time: eventToEdit.time,
          price: eventToEdit.price,
          category: eventToEdit.category,
          emoji: eventToEdit.emoji,
          totalTickets: eventToEdit.totalTickets
        });
      }
    }
  }, [id, getEvent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditMode && id) {
        // Update existing event
        updateEvent(id, formData);
        toast({
          title: "Event updated",
          description: "Your event has been updated successfully."
        });
      } else {
        // Create new event with UUID key
        const eventId = createEvent(formData);
        toast({
          title: "Event created",
          description: "Your event has been created successfully."
        });
      }

      // Navigate back to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error saving your event.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'music', label: 'Music', emoji: '🎵' },
    { value: 'tech', label: 'Technology', emoji: '💻' },
    { value: 'art', label: 'Art', emoji: '🎨' },
    { value: 'food', label: 'Food', emoji: '🍕' },
    { value: 'sports', label: 'Sports', emoji: '🏆' }
  ];

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode ? 'Update your event details' : 'Fill in the details to create a new event'}
          </p>
        </div>
      </div>

      <Card className="glass-card max-w-2xl mx-auto">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{isEditMode ? 'Edit Event' : 'Event Details'}</CardTitle>
            <CardDescription>
              {isEditMode 
                ? 'Update the information for your event' 
                : 'Enter the details for your new event'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter event title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event"
                rows={4}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Event location"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => {
                    const category = categoryOptions.find(cat => cat.value === value);
                    if (category) {
                      handleSelectChange('category', value);
                      handleSelectChange('emoji', category.emoji);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.emoji} {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => handleSelectChange('eventType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">🏢 Physical Event</SelectItem>
                  <SelectItem value="virtual">💻 Virtual Event</SelectItem>
                  <SelectItem value="hybrid">🌐 Hybrid Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="text"
                  value={formData.date}
                  onChange={handleChange}
                  placeholder="MM/DD/YYYY"
                  required
                />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  name="time"
                  type="text"
                  value={formData.time}
                  onChange={handleChange}
                  placeholder="HH:MM AM/PM"
                  required
                />
              </div>
            </div>
            {formData.eventType === 'physical' && (
              <div className="space-y-4 p-4 bg-primary/10 rounded-lg">
                <h3 className="font-medium">Seating Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maxCapacity">Maximum Capacity</Label>
                    <Input 
                      id="maxCapacity" 
                      name="maxCapacity"
                      type="number"
                      value={formData.maxCapacity}
                      onChange={(e) => handleSelectChange('maxCapacity', parseInt(e.target.value) || 0)}
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Base Ticket Price</Label>
                    <Input 
                      id="price" 
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="$0.00"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Seating Sections</Label>
                  {formData.sections.map((section, index) => (
                    <div key={index} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 bg-background/50 rounded">
                      <Input 
                        placeholder="Section name"
                        value={section.name}
                        onChange={(e) => {
                          const newSections = [...formData.sections];
                          newSections[index].name = e.target.value;
                          setFormData(prev => ({ ...prev, sections: newSections }));
                        }}
                      />
                      <Input 
                        type="number"
                        placeholder="Rows"
                        value={section.rows}
                        onChange={(e) => {
                          const newSections = [...formData.sections];
                          newSections[index].rows = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, sections: newSections }));
                        }}
                      />
                      <Input 
                        type="number"
                        placeholder="Seats/Row"
                        value={section.seatsPerRow}
                        onChange={(e) => {
                          const newSections = [...formData.sections];
                          newSections[index].seatsPerRow = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, sections: newSections }));
                        }}
                      />
                      <Input 
                        type="number"
                        placeholder="Price"
                        value={section.price}
                        onChange={(e) => {
                          const newSections = [...formData.sections];
                          newSections[index].price = parseInt(e.target.value) || 0;
                          setFormData(prev => ({ ...prev, sections: newSections }));
                        }}
                      />
                    </div>
                  ))}
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        sections: [...prev.sections, { name: '', rows: 0, seatsPerRow: 0, price: 0 }]
                      }));
                    }}
                  >
                    Add Section
                  </Button>
                </div>
              </div>
            )}
            
            {formData.eventType !== 'physical' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Ticket Price</Label>
                  <Input 
                    id="price" 
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="$0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="totalTickets">Total Tickets</Label>
                  <Input 
                    id="totalTickets" 
                    name="totalTickets"
                    type="number"
                    value={formData.totalTickets}
                    onChange={(e) => handleSelectChange('totalTickets', parseInt(e.target.value) || 0)}
                    min="1"
                    required
                  />
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="logo font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="glow"
              disabled={isSubmitting}
              className="logo font-medium"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Event' : 'Create Event'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default CreateEvent;