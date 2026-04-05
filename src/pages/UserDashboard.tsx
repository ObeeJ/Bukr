import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Heart, Ticket, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getMyTickets } from '@/api/tickets';
import { getFavorites } from '@/api/favorites';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
  const [ticketError, setTicketError] = useState(false);
  const [favoriteError, setFavoriteError] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyTickets()
      .then(t => { setTicketCount(t.length); setTicketError(false); })
      .catch(() => { setTicketCount(0); setTicketError(true); });
    getFavorites()
      .then(f => { setFavoriteCount(f.length); setFavoriteError(false); })
      .catch(() => { setFavoriteCount(0); setFavoriteError(true); });
  }, [user]);

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to Bukr</h1>
          <p className="text-muted-foreground">Discover and book amazing events</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="glass-card hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/favorites')}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Favorites</CardTitle>
              <Heart className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{favoriteCount ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                {favoriteError ? 'Could not load' : 'Saved events'}
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate('/tickets')}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Tickets</CardTitle>
              <Ticket className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketCount ?? '—'}</div>
              <p className="text-xs text-muted-foreground">
                {ticketError ? 'Could not load' : 'Active tickets'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button onClick={() => navigate('/explore')} variant="glow" className="w-full h-12 cta">
            <Calendar className="mr-2 h-5 w-5" />
            Explore Events
          </Button>

          <Button onClick={() => navigate('/profile')} variant="outline" className="w-full h-12">
            <User className="mr-2 h-5 w-5" />
            My Profile
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;