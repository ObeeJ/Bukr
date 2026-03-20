import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Repeat2, Clock, RefreshCw, Gamepad2, UtensilsCrossed, Music, Trophy, Palette, Dumbbell, GraduationCap, Ticket, Hash, Compass } from 'lucide-react';
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
    niche: '',
    ticketModel: 'single',
    usageTotal: '',
    validFrom: '',
    validUntil: '',
    isRenewable: false,
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
            niche: (event as any).niche || '',
            ticketModel: 'single',
            usageTotal: '',
            validFrom: '',
            validUntil: '',
            isRenewable: false,
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
        niche: formData.niche || undefined,
        usageModel: formData.ticketModel !== 'single' ? formData.ticketModel : undefined,
        usageTotal: formData.usageTotal ? parseInt(formData.usageTotal) : undefined,
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
        isRenewable: formData.isRenewable || undefined,
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
            <Label>Event Image (Optional)</Label>
            <ImageUpload
              value={formData.thumbnailUrl}
              onChange={(url) => setFormData({ ...formData, thumbnailUrl: url })}
              label="Upload event thumbnail"
            />
          </div>

          {/* Niche selector — icon grid */}
          <div className="space-y-2">
            <Label>Venue Niche (Optional)</Label>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: '',          label: 'General',   Icon: Compass },
                { value: 'gaming',    label: 'Gaming',    Icon: Gamepad2 },
                { value: 'food',      label: 'Food',      Icon: UtensilsCrossed },
                { value: 'music',     label: 'Music',     Icon: Music },
                { value: 'sports',    label: 'Sports',    Icon: Trophy },
                { value: 'arts',      label: 'Arts',      Icon: Palette },
                { value: 'fitness',   label: 'Fitness',   Icon: Dumbbell },
                { value: 'education', label: 'Education', Icon: GraduationCap },
              ] as { value: string; label: string; Icon: React.ElementType }[]).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, niche: value })}
                  className={`flex flex-col items-center gap-1 rounded-md border px-2 py-3 text-xs transition-colors ${
                    formData.niche === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input bg-background text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket model selector — icon cards */}
          <div className="space-y-2">
            <Label>Ticket Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { value: 'single',     label: 'Single Use',   sub: 'Standard entry, one scan',          Icon: Ticket },
                { value: 'multi',      label: 'Multi-Use',    sub: 'e.g. 4 PS5 sessions',               Icon: Hash },
                { value: 'consumable', label: 'Consumable',   sub: 'Food / drink — one scan, done',     Icon: UtensilsCrossed },
                { value: 'time_bound', label: 'Time-Bound',   sub: 'Valid within a set window',         Icon: Clock },
                { value: 'renewable',  label: 'Renewable',    sub: 'Can be topped up when depleted',    Icon: RefreshCw },
              ] as { value: string; label: string; sub: string; Icon: React.ElementType }[]).map(({ value, label, sub, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, ticketModel: value })}
                  className={`flex items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors ${
                    formData.ticketModel === value
                      ? 'border-primary bg-primary/10'
                      : 'border-input bg-background hover:border-primary/50'
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${
                    formData.ticketModel === value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      formData.ticketModel === value ? 'text-primary' : ''
                    }`}>{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {['multi', 'renewable'].includes(formData.ticketModel) && (
            <div className="space-y-2">
              <Label htmlFor="usageTotal">
                <Hash className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                Number of Uses
              </Label>
              <Input
                id="usageTotal"
                type="number"
                min="2"
                max="100"
                placeholder="e.g. 4 for 4 PS5 sessions"
                value={formData.usageTotal}
                onChange={e => setFormData({ ...formData, usageTotal: e.target.value })}
              />
            </div>
          )}

          {formData.ticketModel === 'time_bound' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validFrom">
                  <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  Valid From
                </Label>
                <Input
                  id="validFrom"
                  type="datetime-local"
                  value={formData.validFrom}
                  onChange={e => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">
                  <Clock className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  Valid Until
                </Label>
                <Input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={e => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </div>
            </div>
          )}

          {['multi', 'time_bound'].includes(formData.ticketModel) && (
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isRenewable: !formData.isRenewable })}
              className={`flex items-center gap-3 w-full rounded-md border px-3 py-3 text-left transition-colors ${
                formData.isRenewable
                  ? 'border-primary bg-primary/10'
                  : 'border-input bg-background hover:border-primary/50'
              }`}
            >
              <Repeat2 className={`h-4 w-4 shrink-0 ${
                formData.isRenewable ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  formData.isRenewable ? 'text-primary' : ''
                }`}>Allow Renewal</p>
                <p className="text-xs text-muted-foreground">Attendees can top up when uses run out</p>
              </div>
            </button>
          )}

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
