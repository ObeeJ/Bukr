import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Users, DollarSign, TrendingUp, Copy, Share2, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import AnimatedLogo from '@/components/AnimatedLogo';

interface Influencer {
  id: string;
  name: string;
  email: string;
  socialHandle: string;
  followers: number;
  commissionRate: number;
  referralCode: string;
  referralLink: string;
  totalSales: number;
  totalEarnings: number;
  status: 'active' | 'pending' | 'inactive';
}

const Influencers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isOrganizer = user?.userType === 'organizer';

  const [influencers, setInfluencers] = useState<Influencer[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      socialHandle: '@sarahjohnson',
      followers: 50000,
      commissionRate: 15,
      referralCode: 'SARAH15',
      referralLink: 'https://bukr.app/ref/SARAH15',
      totalSales: 45,
      totalEarnings: 675,
      status: 'active'
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      socialHandle: '@mikechen',
      followers: 25000,
      commissionRate: 12,
      referralCode: 'MIKE12',
      referralLink: 'https://bukr.app/ref/MIKE12',
      totalSales: 28,
      totalEarnings: 336,
      status: 'active'
    }
  ]);

  const [newInfluencer, setNewInfluencer] = useState({
    name: '',
    email: '',
    socialHandle: '',
    followers: 0,
    commissionRate: 10
  });

  const handleAddInfluencer = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const referralCode = `${newInfluencer.name.substring(0, 4).toUpperCase()}${newInfluencer.commissionRate}`;
      const referralLink = `https://bukr.app/ref/${referralCode}`;
      
      const influencer: Influencer = {
        ...newInfluencer,
        id: Date.now().toString(),
        referralCode,
        referralLink,
        totalSales: 0,
        totalEarnings: 0,
        status: 'pending'
      };
      
      setInfluencers([...influencers, influencer]);
      setNewInfluencer({
        name: '',
        email: '',
        socialHandle: '',
        followers: 0,
        commissionRate: 10
      });
      
      setIsProcessing(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Influencer added",
        description: `${influencer.name} has been added to your influencer program.`
      });
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The referral link has been copied."
    });
  };

  const totalStats = {
    totalInfluencers: influencers.length,
    activeInfluencers: influencers.filter(i => i.status === 'active').length,
    totalSales: influencers.reduce((sum, i) => sum + i.totalSales, 0),
    totalEarnings: influencers.reduce((sum, i) => sum + i.totalEarnings, 0)
  };

  if (!isOrganizer) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-muted-foreground mb-6">This page is only available for event organizers.</p>
          <Button onClick={() => navigate('/app')} className="w-full sm:w-auto min-h-[44px]">
            Explore Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 pb-20 sm:pb-24">
      <div className="flex items-center gap-2 mb-6">
        <AnimatedLogo size="sm" />
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Influencer Program</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your influencer partnerships and track performance
          </p>
        </div>
        <Button 
          variant="glow" 
          onClick={() => setIsAddDialogOpen(true)}
          className="logo font-medium w-full sm:w-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Influencer
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold logo">{totalStats.totalInfluencers}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Active</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold logo text-green-500">{totalStats.activeInfluencers}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-blue-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Sales</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold logo text-blue-500">{totalStats.totalSales}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Earnings</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold logo text-primary">${totalStats.totalEarnings}</div>
          </CardContent>
        </Card>
      </div>

      {/* Influencers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {influencers.map((influencer) => (
          <Card key={influencer.id} className="glass-card">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base sm:text-lg truncate">{influencer.name}</CardTitle>
                  <CardDescription className="text-sm truncate">{influencer.socialHandle}</CardDescription>
                </div>
                <Badge className={
                  influencer.status === 'active' ? 'bg-green-100 text-green-800' :
                  influencer.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  'bg-gray-100 text-gray-800'
                }>
                  {influencer.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Followers:</span>
                  <div className="font-medium logo">{influencer.followers.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission:</span>
                  <div className="font-medium logo">{influencer.commissionRate}%</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Sales:</span>
                  <div className="font-medium logo text-blue-500">{influencer.totalSales}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Earnings:</span>
                  <div className="font-medium logo text-primary">${influencer.totalEarnings}</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Referral Code:</div>
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                  <code className="text-sm font-mono flex-1">{influencer.referralCode}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(influencer.referralCode)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Referral Link:</div>
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                  <code className="text-xs truncate flex-1">{influencer.referralLink}</code>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(influencer.referralLink)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-0">
              <Button 
                variant="outline" 
                className="w-full logo font-medium min-h-[44px]"
                onClick={() => copyToClipboard(influencer.referralLink)}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Link
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Add Influencer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Influencer</DialogTitle>
            <DialogDescription>
              Add a new influencer to your referral program.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={newInfluencer.name}
                onChange={(e) => setNewInfluencer({...newInfluencer, name: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={newInfluencer.email}
                onChange={(e) => setNewInfluencer({...newInfluencer, email: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <Label htmlFor="social">Social Handle</Label>
              <Input 
                id="social" 
                value={newInfluencer.socialHandle}
                onChange={(e) => setNewInfluencer({...newInfluencer, socialHandle: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
                placeholder="@johndoe"
              />
            </div>
            <div>
              <Label htmlFor="followers">Followers Count</Label>
              <Input 
                id="followers" 
                type="number"
                value={newInfluencer.followers}
                onChange={(e) => setNewInfluencer({...newInfluencer, followers: parseInt(e.target.value) || 0})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
                placeholder="10000"
              />
            </div>
            <div>
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input 
                id="commission" 
                type="number"
                min="1"
                max="50"
                value={newInfluencer.commissionRate}
                onChange={(e) => setNewInfluencer({...newInfluencer, commissionRate: parseInt(e.target.value) || 10})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
                placeholder="10"
              />
            </div>
            <div className="pt-4">
              <Button 
                variant="glow" 
                className="w-full logo font-medium min-h-[44px]"
                onClick={handleAddInfluencer}
                disabled={isProcessing || !newInfluencer.name || !newInfluencer.email}
              >
                {isProcessing ? "Adding..." : "Add Influencer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Influencers;