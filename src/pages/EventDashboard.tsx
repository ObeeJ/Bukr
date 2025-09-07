import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, DollarSign, Plus, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EventDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Organizer Dashboard</h1>
            <p className="text-muted-foreground">Manage your events and track performance</p>
          </div>
          <Button 
            onClick={() => navigate('/create-event')} 
            variant="glow" 
            className="w-full sm:w-auto cta"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Event
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">+2 from last month</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attendees</CardTitle>
              <Users className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">+15% from last month</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₦2.4M</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 ml-auto text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">Currently running</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button 
            onClick={() => navigate('/events')} 
            variant="outline" 
            className="h-16 text-left justify-start"
          >
            <Calendar className="mr-3 h-6 w-6" />
            <div>
              <div className="font-medium">Manage Events</div>
              <div className="text-sm text-muted-foreground">View and edit your events</div>
            </div>
          </Button>

          <Button 
            onClick={() => navigate('/influencers')} 
            variant="outline" 
            className="h-16 text-left justify-start"
          >
            <Users className="mr-3 h-6 w-6" />
            <div>
              <div className="font-medium">Influencers</div>
              <div className="text-sm text-muted-foreground">Manage event influencers</div>
            </div>
          </Button>

          <Button 
            onClick={() => navigate('/profile')} 
            variant="outline" 
            className="h-16 text-left justify-start"
          >
            <Settings className="mr-3 h-6 w-6" />
            <div>
              <div className="font-medium">Profile Settings</div>
              <div className="text-sm text-muted-foreground">Update your profile</div>
            </div>
          </Button>

          <Button 
            onClick={() => navigate('/myevents')} 
            variant="outline" 
            className="h-16 text-left justify-start"
          >
            <Calendar className="mr-3 h-6 w-6" />
            <div>
              <div className="font-medium">My Events</div>
              <div className="text-sm text-muted-foreground">View event history</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;