import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Calendar, Music, Code, Palette, Utensils, Trophy, Heart, Share2, Info, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AnimatedLogo from '@/components/AnimatedLogo';
import { useNavigate } from 'react-router-dom';
import BookingFlow from '@/components/BookingFlow';

const Explore = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [bookingFlowOpen, setBookingFlowOpen] = useState(false);
  const navigate = useNavigate();

  const categories = [
    { id: 'all', name: 'All', icon: Calendar },
    { id: 'music', name: 'Music', icon: Music },
    { id: 'tech', name: 'Tech', icon: Code },
    { id: 'art', name: 'Art', icon: Palette },
    { id: 'food', name: 'Food', icon: Utensils },
    { id: 'sports', name: 'Sports', icon: Trophy },
  ];

  const [favorites, setFavorites] = useState<number[]>([]);
  const [ratings, setRatings] = useState<{[key: number]: number}>({});

  const events = [
    { 
      id: 1, 
      title: 'Summer Music Festival', 
      date: 'July 15, 2023', 
      time: '6:00 PM', 
      location: 'Central Park, NY',
      price: '$50',
      category: 'music',
      emoji: '🎵',
      rating: 4.8,
      description: 'Experience the ultimate summer music festival featuring top artists from around the world. Food, drinks, and amazing vibes!'
    },
    { 
      id: 2, 
      title: 'Tech Conference 2023', 
      date: 'August 20, 2023', 
      time: '9:00 AM', 
      location: 'Convention Center, SF',
      price: '$150',
      category: 'tech',
      emoji: '💻',
      rating: 4.5,
      description: 'Join industry leaders and innovators for the biggest tech conference of the year. Workshops, networking, and cutting-edge demos.'
    },
    { 
      id: 3, 
      title: 'Art Exhibition', 
      date: 'September 10, 2023', 
      time: '10:00 AM', 
      location: 'Modern Art Gallery, LA',
      price: '$25',
      category: 'art',
      emoji: '🎨',
      rating: 4.3,
      description: 'Explore contemporary art from emerging and established artists. Interactive installations and guided tours available.'
    },
    { 
      id: 4, 
      title: 'Food Festival', 
      date: 'October 5, 2023', 
      time: '12:00 PM', 
      location: 'Downtown, Chicago',
      price: '$35',
      category: 'food',
      emoji: '🍕',
      rating: 4.7,
      description: 'Taste culinary delights from over 50 restaurants and food trucks. Cooking demonstrations and food competitions all day.'
    },
    { 
      id: 5, 
      title: 'Sports Championship', 
      date: 'November 12, 2023', 
      time: '3:00 PM', 
      location: 'Stadium, Dallas',
      price: '$75',
      category: 'sports',
      emoji: '🏆',
      rating: 4.6,
      description: 'Witness the ultimate showdown between top teams competing for the championship title. Pre-game entertainment and exclusive merchandise.'
    },
    { 
      id: 6, 
      title: 'Comedy Night', 
      date: 'December 3, 2023', 
      time: '8:00 PM', 
      location: 'Comedy Club, NYC',
      price: '$45',
      category: 'music',
      emoji: '😂',
      rating: 4.4,
      description: 'Laugh out loud with performances from the funniest comedians in the country. VIP packages include meet and greet.'
    }
  ];
  
  // Sort events by rating (highest first)
  const sortedEvents = [...events].sort((a, b) => b.rating - a.rating);
  
  const toggleFavorite = (eventId: number) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId];
      
      // Save to localStorage
      localStorage.setItem('bukr_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };
  
  const rateEvent = (eventId: number, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [eventId]: rating
    }));
  };

  const filteredEvents = (category: string) => {
    let filtered = sortedEvents;
    
    if (category !== 'all') {
      filtered = filtered.filter(event => event.category === category);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) || 
        event.location.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const openEventDetails = (event: any) => {
    setSelectedEvent(event);
    setEventDetailsOpen(true);
  };

  const handleBookNow = (event: any) => {
    setSelectedEvent(event);
    setEventDetailsOpen(false);
    setBookingFlowOpen(true);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
          />
        ))}
        <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Explore Events</h1>
          <p className="text-muted-foreground">Discover and book amazing events</p>
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10 glass-card border-glass-border bg-glass/20"
          placeholder="Search events, venues, cities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="flex overflow-x-auto pb-2 mb-8 bg-background/50 backdrop-blur-sm rounded-xl border border-border/30">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2 py-3 px-4">
              <category.icon className="w-4 h-4" />
              <span className="font-medium logo">{category.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents(category.id).map((event) => (
                <Card key={event.id} className="glass-card relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg font-medium">{event.title}</CardTitle>
                        <CardDescription className="text-sm">{event.date} • {event.time}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-primary/10">
                        {renderStars(event.rating)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                      <span className="text-6xl">{event.emoji}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Location:</span> {event.location}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Price:</span> {event.price}
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2">
                    <div className="flex gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={favorites.includes(event.id) ? "text-primary" : ""}
                              onClick={() => toggleFavorite(event.id)}
                            >
                              <Heart className={`w-5 h-5 ${favorites.includes(event.id) ? "fill-primary" : ""}`} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {favorites.includes(event.id) ? "Remove from favorites" : "Add to favorites"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openEventDetails(event)}>
                              <Info className="w-5 h-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            View details
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Share2 className="w-5 h-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Share event
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button 
                      variant="glow" 
                      size="sm" 
                      className="logo font-medium"
                      onClick={() => handleBookNow(event)}
                    >
                      Book Now
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            {filteredEvents(category.id).length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No events found. Try a different search.</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Event Details Dialog */}
      <Dialog open={eventDetailsOpen} onOpenChange={setEventDetailsOpen}>
        {selectedEvent && (
          <DialogContent className="glass-card border-glass-border max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>{selectedEvent.title}</DialogTitle>
              <DialogDescription>{selectedEvent.date} • {selectedEvent.time}</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                <span className="text-6xl">{selectedEvent.emoji}</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <Badge variant="outline" className="bg-primary/10">
                  {renderStars(selectedEvent.rating)}
                </Badge>
                <p className="text-lg font-bold text-primary">{selectedEvent.price}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-1">Location</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.location}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedEvent.description}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={favorites.includes(selectedEvent.id) ? "text-primary" : ""}
                  onClick={() => toggleFavorite(selectedEvent.id)}
                >
                  <Heart className={`w-5 h-5 ${favorites.includes(selectedEvent.id) ? "fill-primary" : ""}`} />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
              <Button 
                variant="glow" 
                className="logo font-medium"
                onClick={() => handleBookNow(selectedEvent)}
              >
                Book Now
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Booking Flow */}
      {selectedEvent && (
        <BookingFlow 
          isOpen={bookingFlowOpen} 
          onClose={() => setBookingFlowOpen(false)} 
          event={selectedEvent} 
        />
      )}
    </div>
  );
};

export default Explore;