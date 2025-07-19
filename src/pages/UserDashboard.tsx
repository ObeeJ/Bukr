import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Ticket, Heart, User } from 'lucide-react';
import AnimatedLogo from '@/components/AnimatedLogo';

const UserDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-muted-foreground">Manage your events and tickets</p>
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="upcoming" className="flex items-center gap-2 logo font-medium">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Upcoming</span>
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2 logo font-medium">
            <Ticket className="w-4 h-4" />
            <span className="hidden sm:inline">My Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="flex items-center gap-2 logo font-medium">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Favorites</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2 logo font-medium">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="glass-card">
                <CardHeader>
                  <CardTitle>Summer Music Festival</CardTitle>
                  <CardDescription>July 15, 2023 • 6:00 PM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                    <span className="text-6xl">🎵</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your tickets: 2 × General Admission
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="logo font-medium">View Details</Button>
                  <Button variant="glow" className="logo font-medium">View Tickets</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="glass-card">
                <CardHeader>
                  <CardTitle>Tech Conference 2023</CardTitle>
                  <CardDescription>August 20, 2023 • 9:00 AM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                    <span className="text-6xl">💻</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your tickets: 1 × VIP Access
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="logo font-medium">View Details</Button>
                  <Button variant="glow" className="logo font-medium">View Ticket</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="glass-card">
                <CardHeader>
                  <CardTitle>Art Exhibition</CardTitle>
                  <CardDescription>September 10, 2023 • 10:00 AM</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-md flex items-center justify-center mb-4">
                    <span className="text-6xl">🎨</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" className="logo font-medium">View Details</Button>
                  <Button variant="glow" className="logo font-medium">Book Now</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Manage your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="logo font-medium">Edit Profile</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserDashboard;