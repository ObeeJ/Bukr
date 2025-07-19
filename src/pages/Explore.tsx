import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Calendar, Music, Code, Palette, Utensils, Trophy, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Explore = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', name: 'All', icon: Calendar },
    { id: 'music', name: 'Music', icon: Music },
    { id: 'tech', name: 'Tech', icon: Code },
    { id: 'art', name: 'Art', icon: Palette },
    { id: 'food', name: 'Food', icon: Utensils },
    { id: 'sports', name: 'Sports', icon: Trophy },
  ];

  const events = [
    { 
      id: 1, 
      title: 'Summer Music Festival', 
      date: 'July 15, 2023', 
      time: '6:00 PM', 
      location: 'Central Park, NY',
      price: '$50',
      category: 'music',
      emoji: '🎵'
    },
    { 
      id: 2, 
      title: 'Tech Conference 2023', 
      date: 'August 20, 2023', 
      time: '9:00 AM', 
      location: 'Convention Center, SF',
      price: '$150',
      category: 'tech',
      emoji: '💻'
    },
    { 
      id: 3, 
      title: 'Art Exhibition', 
      date: 'September 10, 2023', 
      time: '10:00 AM', 
      location: 'Modern Art Gallery, LA',
      price: '$25',
      category: 'art',
      emoji: '🎨'
    },
    { 
      id: 4, 
      title: 'Food Festival', 
      date: 'October 5, 2023', 
      time: '12:00 PM', 
      location: 'Downtown, Chicago',
      price: '$35',
      category: 'food',
      emoji: '🍕'
    },
    { 
      id: 5, 
      title: 'Sports Championship', 
      date: 'November 12, 2023', 
      time: '3:00 PM', 
      location: 'Stadium, Dallas',
      price: '$75',
      category: 'sports',
      emoji: '🏆'
    },
    { 
      id: 6, 
      title: 'Comedy Night', 
      date: 'December 3, 2023', 
      time: '8:00 PM', 
      location: 'Comedy Club, NYC',
      price: '$45',
      category: 'music',
      emoji: '😂'
    }
  ];

  const filteredEvents = (category: string) => {
    let filtered = events;
    
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
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
        <TabsList className="flex overflow-x-auto pb-2 mb-8 glass-card">
          {categories.map(category => (
            <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
              <category.icon className="w-4 h-4" />
              <span>{category.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents(category.id).map((event) => (
                <Card key={event.id} className="glass-card">
                  <CardHeader>
                    <CardTitle>{event.title}</CardTitle>
                    <CardDescription>{event.date} • {event.time}</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" className="flex items-center gap-2">
                      <Heart className="w-4 h-4" />
                      Save
                    </Button>
                    <Button variant="glow">Book Now</Button>
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
    </div>
  );
};

export default Explore;