import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { toast } from 'sonner';

import { ImageUpload } from '@/components/ImageUpload';

const CreateEvent = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addEvent, updateEvent, getEvent } = useEvent();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isEditMode = !!id;
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    price: '',
    category: '',
    totalTickets: '',
    currency: 'NGN',
    thumbnailUrl: '',
    emoji: '',
  });

  useEffect(() => {
    if (isEditMode && id) {
      setIsLoading(true);
      getEvent(id).then(event => {
        if (event) {
          setFormData({
            title: event.title,
            description: event.description || '',
            date: event.date,
            time: event.time || '',
            location: event.location,
            price: event.price?.toString() || '0',
            category: event.category,
            totalTickets: event.totalTickets?.toString() || '0',
            currency: event.currency || 'NGN',
            thumbnailUrl: event.thumbnailUrl || '',
            emoji: event.emoji || '',
          });
        } else {
          toast.error('Event not found');
          navigate('/dashboard');
        }
      }).catch(() => {
        toast.error('Failed to load event');
        navigate('/dashboard');
      }).finally(() => setIsLoading(false));
    }
  }, [id, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const price = parseFloat(formData.price) || 0;
    const totalTickets = parseInt(formData.totalTickets) || 0;
    const eventDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      toast.error('Event date cannot be in the past');
      return;
    }
    if (price < 0) {
      toast.error('Price cannot be negative');
      return;
    }
    if (totalTickets < 1) {
      toast.error('Total tickets must be at least 1');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        price,
        category: formData.category,
        totalTickets,
        currency: formData.currency,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        emoji: formData.emoji || undefined,
      };
      
      if (isEditMode && id) {
        await updateEvent(id, eventData);
        toast.success('Event updated successfully!');
      } else {
        await addEvent(eventData);
        toast.success('Event created successfully!');
      }
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEditMode ? 'update' : 'create'} event`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Event' : 'Create New Event'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 glass-card p-6">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              placeholder="Enter event title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your event"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Event location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ({formData.currency === 'NGN' ? '₦' : '$'})</Label>
              <Input
                id="price"
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalTickets">Total Tickets</Label>
              <Input
                id="totalTickets"
                type="number"
                placeholder="100"
                value={formData.totalTickets}
                onChange={(e) => setFormData({ ...formData, totalTickets: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              placeholder="e.g., Music, Tech, Sports"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emoji">Event Emoji (Optional)</Label>
            <Input
              id="emoji"
              placeholder="🎉"
              value={formData.emoji}
              onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
              maxLength={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Event Image (Optional)</Label>
            <ImageUpload
              value={formData.thumbnailUrl}
              onChange={(url) => setFormData({ ...formData, thumbnailUrl: url })}
              label="Upload event thumbnail"
            />
          </div>

          <Button type="submit" variant="glow" className="w-full h-12 cta" disabled={isSubmitting || isLoading}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? 'Updating...' : 'Creating...'}
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              isEditMode ? 'Update Event' : 'Create Event'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
