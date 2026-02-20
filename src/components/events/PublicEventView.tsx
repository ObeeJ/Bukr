import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Calendar, MapPin, Share2, Ticket, Check, Users, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Event } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import SeatingMap from './SeatingMap';

import { claimFreeTicket } from '@/api/events';
import { toast } from 'sonner';

interface PublicEventViewProps {
    event: Event;
}

const PublicEventView = ({ event }: PublicEventViewProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [guestNames, setGuestNames] = useState<string[]>([]);
    const [claiming, setClaiming] = useState(false);

    const isFreeEvent = !event.price || event.price === 0;

    const handleClaimFreeTicket = async () => {
        if (!user) {
            toast.error('Please sign in to claim ticket');
            navigate('/signin');
            return;
        }

        setClaiming(true);
        try {
            await claimFreeTicket(event.id);
            toast.success('Free ticket claimed successfully!');
            navigate('/tickets');
        } catch (error: any) {
            toast.error(error.message || 'Failed to claim ticket');
        } finally {
            setClaiming(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: event.title,
                    text: `Check out ${event.title} on Bukr!`,
                    url: window.location.href,
                });
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            // Fallback logic could go here
            alert("Link copied to clipboard!");
        }
    };

    const handleBooking = () => {
        const ticketType = event.ticketTypes?.find(t => t.id === selectedTicketId);
        if (!ticketType) return;

        // Validation for seated tickets
        if (ticketType.hasSeating && selectedSeats.length !== quantity) {
            alert(`Please select exactly ${quantity} seat(s). You have selected ${selectedSeats.length}.`);
            return;
        }

        // Validate Guest Names (optional but good UI)
        if (quantity > 1 && guestNames.filter(n => n.trim() !== '').length < quantity - 1) {
            const proceed = window.confirm("Some guest names are missing. Proceed anyway?");
            if (!proceed) return;
        }

        // Mock Booking Logic
        // In a real app, this would make an API call to create multiple tickets
        alert(`Booking Confirmed! \n\nEvent: ${event.title}\nTicket: ${ticketType.name} x${quantity}\nTotal: ₦${(ticketType.price * quantity).toLocaleString()}\nSeats: ${selectedSeats.join(', ') || 'N/A'}\nGuests: ${guestNames.join(', ') || 'None'}`);

        // Reset or Navigate
        setSelectedSeats([]);
        setQuantity(1);
        setGuestNames([]);
        // navigate('/tickets'); // Uncomment to redirect
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Hero Section */}
            <div className="relative h-[50vh] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 z-10" />
                <img
                    src={event.image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop"}
                    alt={event.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 z-20 flex justify-between w-[calc(100%-2rem)]">
                    <Button variant="ghost" onClick={() => navigate('/events')} className="bg-background/20 backdrop-blur-md hover:bg-background/40 text-white">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back
                    </Button>
                    {event.allowShare && (
                        <Button variant="ghost" onClick={handleShare} className="bg-background/20 backdrop-blur-md hover:bg-background/40 text-white rounded-full p-2">
                            <Share2 className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-20 relative z-20">
                {/* Header content */}
                <div className="flex flex-col lg:flex-row justify-between items-end mb-8 gap-6">
                    <div className="flex-1">
                        <h1 className="text-4xl lg:text-6xl font-bold mb-4 text-white text-glow leading-tight">{event.title}</h1>
                        <div className="flex flex-wrap gap-6 text-gray-200 mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                <span className="text-lg">{event.date} • {event.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-primary" />
                                <span className="text-lg">{event.location}</span>
                            </div>
                        </div>
                        <p className="text-lg text-gray-300 max-w-2xl">{event.description}</p>
                    </div>
                </div>

                {/* Ticket Selection Section */}
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        {/* Gallery Section */}
                        <div>
                            <h2 className="text-2xl font-bold mb-6">Event Gallery</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Placeholders for gallery */}
                                {[
                                    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1459749411177-8c4750bb0e8f?q=80&w=1000&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1533174072545-e8d4aa97edf9?q=80&w=1000&auto=format&fit=crop"
                                ].map((src, i) => (
                                    <div key={i} className={`rounded-xl overflow-hidden glass-card hover:scale-[1.02] transition-transform duration-300 ${i === 0 ? 'col-span-2 row-span-2' : ''}`}>
                                        <img src={src} alt={`Event gallery ${i + 1}`} className="w-full h-full object-cover aspect-square" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Booking Card */}
                    <div className="md:col-span-1">
                        <div className="sticky top-24">
                            <Card className="glass-card border-primary/20 bg-background/50 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Ticket className="w-5 h-5 text-primary" />
                                        Select Tickets
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {event.ticketTypes?.map(ticket => (
                                        <div
                                            key={ticket.id}
                                            onClick={() => {
                                                if (selectedTicketId !== ticket.id) {
                                                    setSelectedTicketId(ticket.id);
                                                    setQuantity(1);
                                                    setGuestNames([]);
                                                    setSelectedSeats([]);
                                                }
                                            }}
                                            className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedTicketId === ticket.id ? 'border-primary bg-primary/10' : 'border-transparent bg-secondary/50 hover:bg-secondary/80'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-lg">{ticket.name}</span>
                                                {selectedTicketId === ticket.id && <Check className="w-5 h-5 text-primary" />}
                                            </div>
                                            <div className="text-2xl font-bold text-primary mb-1">₦{ticket.price.toLocaleString()}</div>
                                            <p className="text-sm text-muted-foreground">{ticket.description}</p>

                                            {/* Step 1: Seat Selection (if applicable) */}
                                            {ticket.hasSeating && selectedTicketId === ticket.id && ticket.seatingConfig && (
                                                <div className="mt-3 pt-3 border-t border-primary/20">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-xs font-semibold uppercase text-muted-foreground">Seat Selection</label>
                                                        <span className="text-xs font-bold text-primary">
                                                            {selectedSeats.length > 0 ? `${selectedSeats.length} Selected` : 'None Selected'}
                                                        </span>
                                                    </div>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={selectedSeats.length === quantity ? "w-full border-green-500 text-green-500" : "w-full"}
                                                            >
                                                                {selectedSeats.length > 0 ? (selectedSeats.length === quantity ? 'Seats Confirmed' : 'Edit Seats') : 'Select Seats'}
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl">
                                                            <DialogHeader>
                                                                <DialogTitle>Select Your Seats</DialogTitle>
                                                                <DialogDescription>
                                                                    Select exactly {quantity} seat(s). {selectedSeats.length} currently selected.
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <SeatingMap
                                                                config={ticket.seatingConfig}
                                                                bookedSeats={['seat-1-1', 'seat-1-2', 'table-1-s1', 'table-1-s2']} // Mock booked seats
                                                                selectedSeat={null}
                                                                onSelect={() => { }} // No-op for single select in this mode
                                                                onSelectMultiple={(seats) => setSelectedSeats(seats)}
                                                                selectedSeats={selectedSeats}
                                                                maxSeats={quantity}
                                                            />
                                                            <div className="flex justify-end mt-4">
                                                                <DialogTrigger asChild>
                                                                    <Button disabled={selectedSeats.length !== quantity}>
                                                                        {selectedSeats.length !== quantity ? `Select ${quantity - selectedSeats.length} more` : 'Confirm Selection'}
                                                                    </Button>
                                                                </DialogTrigger>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            )}

                                            {/* Step 2: Quantity & Calculation (Shows when selected) */}
                                            {selectedTicketId === ticket.id && (
                                                <div className="mt-4 pt-4 border-t border-primary/20 space-y-4">
                                                    {/* Quantity Selector */}
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase text-muted-foreground block mb-2">Quantity</label>
                                                        <div className="flex items-center gap-3">
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newQuantity = Math.max(1, quantity - 1);
                                                                    setQuantity(newQuantity);
                                                                    setGuestNames(prev => prev.slice(0, newQuantity - 1));
                                                                    // Reset seats if quantity drops below selected count or just warn?
                                                                    // For simplicity, we keep selected seats but user must adjust them if count mismatch
                                                                    if (selectedSeats.length > newQuantity) {
                                                                        setSelectedSeats(prev => prev.slice(0, newQuantity));
                                                                    }
                                                                }}
                                                                disabled={quantity <= 1}
                                                            >
                                                                -
                                                            </Button>
                                                            <span className="text-lg font-bold w-8 text-center">{quantity}</span>
                                                            <Button
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setQuantity(Math.min(10, quantity + 1));
                                                                }}
                                                                disabled={quantity >= 10}
                                                            >
                                                                +
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Guest Details (if > 1) */}
                                                    {(quantity > 1) && (
                                                        <div className="bg-secondary/30 p-3 rounded-lg space-y-3">
                                                            <p className="text-sm font-medium flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-primary" />
                                                                Guest Details
                                                            </p>
                                                            {Array.from({ length: quantity - 1 }).map((_, idx) => (
                                                                <div key={idx} className="space-y-1">
                                                                    <input
                                                                        type="text"
                                                                        placeholder={`Guest ${idx + 1} Name`}
                                                                        className="w-full bg-background border border-input rounded text-sm px-3 py-1.5 focus:outline-none focus:border-primary"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        value={guestNames[idx] || ''}
                                                                        onChange={(e) => {
                                                                            const newGuestNames = [...guestNames];
                                                                            newGuestNames[idx] = e.target.value;
                                                                            setGuestNames(newGuestNames);
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Total Price Calculator */}
                                                    <div className="flex justify-between items-center bg-primary/10 p-3 rounded-lg border border-primary/20">
                                                        <span className="font-medium">Total Price</span>
                                                        <span className="text-xl font-bold text-primary">₦{(ticket.price * quantity).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        size="lg"
                                        className="w-full mt-4 font-bold text-lg h-12"
                                        disabled={!selectedTicketId && !isFreeEvent}
                                        onClick={isFreeEvent ? handleClaimFreeTicket : handleBooking}
                                    >
                                        {claiming ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Claiming...
                                            </>
                                        ) : isFreeEvent ? (
                                            'Claim Free Ticket'
                                        ) : (
                                            'Book Now'
                                        )}
                                    </Button>
                                    <p className="text-xs text-center text-muted-foreground mt-2">
                                        Secure payment powered by Paystack
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicEventView;
