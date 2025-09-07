import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Heart, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sampleEvents = [
  {
    id: 1,
    title: 'Tech Conference 2025',
    date: '2025-03-15',
    location: 'Lagos, Nigeria',
    price: '₦15,000',
    image: '🎯'
  },
  {
    id: 2,
    title: 'Music Festival',
    date: '2025-04-20',
    location: 'Abuja, Nigeria',
    price: '₦8,000',
    image: '🎵'
  }
];

const Explore = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/app')}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Explore Events</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sampleEvents.map((event) => (
            <Card key={event.id} className="glass-card hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-3xl mb-2">{event.image}</div>
                  <Button variant="ghost" size="icon">
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" />
                  {event.date}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold text-primary">{event.price}</span>
                  <Button variant="glow" size="sm" className="cta">
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Explore;