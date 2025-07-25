import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Trash, Mail, Share2, Loader2, TrendingUp, DollarSign, Ticket } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';
import { Collaborator } from '@/types';

interface EventCollaboratorsProps {
  eventId: string;
  eventName: string;
  totalTickets: number;
}

const EventCollaborators = ({ eventId, eventName, totalTickets }: EventCollaboratorsProps) => {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mock collaborators with performance data
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      accountNumber: '0123456789',
      bankName: 'First Bank',
      ticketAllocation: 50,
      discountPercentage: 5,
      uniqueCode: 'JOHN-EVENT-123',
      referralLink: `${window.origin}/purchase/${eventId}?ref=JOHN-EVENT-123`,
      ticketsSold: 12,
      earnings: 180
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      accountNumber: '9876543210',
      bankName: 'Second Bank',
      ticketAllocation: 30,
      discountPercentage: 8,
      uniqueCode: 'JANE-EVENT-456',
      referralLink: `${window.origin}/purchase/${eventId}?ref=JANE-EVENT-456`,
      ticketsSold: 8,
      earnings: 120
    }
  ]);
  
  const [newCollaborator, setNewCollaborator] = useState<Omit<Collaborator, 'id' | 'uniqueCode' | 'referralLink' | 'ticketsSold' | 'earnings'>>({
    name: '',
    email: '',
    accountNumber: '',
    bankName: '',
    ticketAllocation: 10,
    discountPercentage: 10
  });

  const handleAddCollaborator = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const uniqueCode = `${newCollaborator.name.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const referralLink = `${window.origin}/purchase/${eventId}?ref=${uniqueCode}`;
      
      const collaborator: Collaborator = {
        ...newCollaborator,
        id: Date.now().toString(),
        uniqueCode,
        referralLink,
        ticketsSold: 0,
        earnings: 0
      };
      
      setCollaborators([...collaborators, collaborator]);
      setNewCollaborator({
        name: '',
        email: '',
        accountNumber: '',
        bankName: '',
        ticketAllocation: 10,
        discountPercentage: 10
      });
      
      setIsProcessing(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Collaborator added",
        description: `${collaborator.name} has been added with referral link generated.`
      });
    }, 1000);
  };

  const handleRemoveCollaborator = (id: string) => {
    setCollaborators(collaborators.filter(c => c.id !== id));
    toast({
      title: "Collaborator removed",
      description: "The collaborator has been removed successfully."
    });
  };

  const handleInvite = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    setIsInviteDialogOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The link has been copied to your clipboard."
    });
  };

  const generateScannerLink = (code: string) => {
    return `${window.origin}/#/scan/${eventId}?code=${code}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Event Collaborators</h2>
        <Button 
          variant="glow" 
          onClick={() => setIsAddDialogOpen(true)}
          className="logo font-medium w-full sm:w-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Collaborator
        </Button>
      </div>

      {/* Performance Summary */}
      {collaborators.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Sold</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {collaborators.reduce((sum, c) => sum + (c.ticketsSold || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Total Earnings</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                ${collaborators.reduce((sum, c) => sum + (c.earnings || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Remaining</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold">
                {collaborators.reduce((sum, c) => sum + (c.ticketAllocation - (c.ticketsSold || 0)), 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {collaborators.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <p className="text-muted-foreground mb-4">No collaborators added yet</p>
          <Button 
            variant="outline" 
            onClick={() => setIsAddDialogOpen(true)}
            className="logo font-medium min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Collaborator
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {collaborators.map(collaborator => (
            <Card key={collaborator.id} className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg truncate">{collaborator.name}</CardTitle>
                    <CardDescription className="text-sm truncate">{collaborator.email}</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    className="flex-shrink-0 touch-target"
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Allocated:</span>
                    <div className="font-medium">{collaborator.ticketAllocation}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sold:</span>
                    <div className="font-medium text-green-600">{collaborator.ticketsSold || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discount:</span>
                    <div className="font-medium">{collaborator.discountPercentage}%</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Earnings:</span>
                    <div className="font-medium text-primary">${collaborator.earnings || 0}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Referral Link:</div>
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                    <code className="text-xs truncate flex-1 font-mono">
                      {collaborator.referralLink}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="flex-shrink-0 h-6 w-6"
                      onClick={() => copyToClipboard(collaborator.referralLink || '')}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Scanner Code:</div>
                  <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                    <code className="text-xs font-mono flex-1">{collaborator.uniqueCode}</code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="flex-shrink-0 h-6 w-6"
                      onClick={() => copyToClipboard(collaborator.uniqueCode)}
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
                  onClick={() => handleInvite(collaborator)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Access
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Collaborator Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Collaborator</DialogTitle>
            <DialogDescription>
              Add a collaborator to help manage and sell tickets for {eventName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={newCollaborator.name}
                onChange={(e) => setNewCollaborator({...newCollaborator, name: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={newCollaborator.email}
                onChange={(e) => setNewCollaborator({...newCollaborator, email: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="bank">Bank Name</Label>
              <Input 
                id="bank" 
                value={newCollaborator.bankName}
                onChange={(e) => setNewCollaborator({...newCollaborator, bankName: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
              />
            </div>
            <div>
              <Label htmlFor="account">Account Number</Label>
              <Input 
                id="account" 
                value={newCollaborator.accountNumber}
                onChange={(e) => setNewCollaborator({...newCollaborator, accountNumber: e.target.value})}
                className="glass-card border-glass-border bg-glass/20 min-h-[44px]"
              />
            </div>
            <div>
              <Label>Ticket Allocation ({newCollaborator.ticketAllocation})</Label>
              <Slider 
                defaultValue={[newCollaborator.ticketAllocation]} 
                max={Math.min(totalTickets, 100)}
                step={1}
                onValueChange={(value) => setNewCollaborator({...newCollaborator, ticketAllocation: value[0]})}
                className="my-3"
              />
              <p className="text-xs text-muted-foreground">
                Maximum tickets this collaborator can sell: {newCollaborator.ticketAllocation}
              </p>
            </div>
            <div>
              <Label>Commission Percentage ({newCollaborator.discountPercentage}%)</Label>
              <Slider 
                defaultValue={[newCollaborator.discountPercentage]} 
                max={20}
                step={1}
                onValueChange={(value) => setNewCollaborator({...newCollaborator, discountPercentage: value[0]})}
                className="my-3"
              />
              <p className="text-xs text-muted-foreground">
                Commission this collaborator will earn: {newCollaborator.discountPercentage}%
              </p>
            </div>
            <div className="pt-4">
              <Button 
                variant="glow" 
                className="w-full logo font-medium min-h-[44px]"
                onClick={handleAddCollaborator}
                disabled={isProcessing || !newCollaborator.name || !newCollaborator.email}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Add Collaborator"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Share Access</DialogTitle>
            <DialogDescription>
              Share access links with {selectedCollaborator?.name} for {eventName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm mb-2 font-medium">Referral Link:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs truncate flex-1 p-2 bg-background/50 rounded">
                  {selectedCollaborator?.referralLink}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="touch-target"
                  onClick={() => selectedCollaborator?.referralLink && copyToClipboard(selectedCollaborator.referralLink)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm mb-2 font-medium">Scanner Link:</p>
              <div className="flex items-center gap-2">
                <code className="text-xs truncate flex-1 p-2 bg-background/50 rounded">
                  {selectedCollaborator && generateScannerLink(selectedCollaborator.uniqueCode)}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="touch-target"
                  onClick={() => selectedCollaborator && copyToClipboard(generateScannerLink(selectedCollaborator.uniqueCode))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 logo font-medium min-h-[44px]"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                Close
              </Button>
              <Button 
                variant="glow" 
                className="flex-1 logo font-medium min-h-[44px]"
                onClick={() => {
                  if (selectedCollaborator?.referralLink) {
                    copyToClipboard(selectedCollaborator.referralLink);
                  }
                  setIsInviteDialogOpen(false);
                }}
              >
                <Share2 className="mr-2 h-4 w-4" />
                Copy Referral Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventCollaborators;