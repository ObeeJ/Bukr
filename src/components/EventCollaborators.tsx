import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Trash, Mail, Share2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  bankName: string;
  ticketAllocation: number;
  discountPercentage: number;
  uniqueCode: string;
}

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
  
  // In a real app, this would be fetched from an API
  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      accountNumber: '0123456789',
      bankName: 'First Bank',
      ticketAllocation: 50,
      discountPercentage: 5,
      uniqueCode: 'JOHN-EVENT-123'
    }
  ]);
  
  const [newCollaborator, setNewCollaborator] = useState<Omit<Collaborator, 'id' | 'uniqueCode'>>({
    name: '',
    email: '',
    accountNumber: '',
    bankName: '',
    ticketAllocation: 10,
    discountPercentage: 0
  });

  const handleAddCollaborator = () => {
    setIsProcessing(true);
    
    // In a real app, this would be an API call
    setTimeout(() => {
      const uniqueCode = `${eventId.substring(0, 4)}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      const collaborator: Collaborator = {
        ...newCollaborator,
        id: Date.now().toString(),
        uniqueCode
      };
      
      setCollaborators([...collaborators, collaborator]);
      setNewCollaborator({
        name: '',
        email: '',
        accountNumber: '',
        bankName: '',
        ticketAllocation: 10,
        discountPercentage: 0
      });
      
      setIsProcessing(false);
      setIsAddDialogOpen(false);
      
      toast({
        title: "Collaborator added",
        description: `${collaborator.name} has been added as a collaborator.`
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

  const sendInvite = () => {
    setIsProcessing(true);
    
    // In a real app, this would send an email or notification
    setTimeout(() => {
      setIsProcessing(false);
      setIsInviteDialogOpen(false);
      
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${selectedCollaborator?.name}.`
      });
    }, 1000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    
    toast({
      title: "Copied to clipboard",
      description: "The unique code has been copied to your clipboard."
    });
  };

  const generateScannerLink = (code: string) => {
    // In a real app, this would be a proper URL
    return `${window.location.origin}/#/scan/${eventId}?code=${code}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Event Collaborators</h2>
        <Button 
          variant="glow" 
          onClick={() => setIsAddDialogOpen(true)}
          className="logo font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Collaborator
        </Button>
      </div>
      
      {collaborators.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <p className="text-muted-foreground mb-4">No collaborators added yet</p>
          <Button 
            variant="outline" 
            onClick={() => setIsAddDialogOpen(true)}
            className="logo font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Collaborator
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {collaborators.map(collaborator => (
            <Card key={collaborator.id} className="glass-card">
              <CardHeader>
                <div className="flex justify-between">
                  <div>
                    <CardTitle>{collaborator.name}</CardTitle>
                    <CardDescription>{collaborator.email}</CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                  >
                    <Trash className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Allocation:</span>
                  <span className="font-medium">{collaborator.ticketAllocation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Discount:</span>
                  <span className="font-medium">{collaborator.discountPercentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Bank:</span>
                  <span className="font-medium">{collaborator.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Account:</span>
                  <span className="font-medium">•••• {collaborator.accountNumber.slice(-4)}</span>
                </div>
                <div className="mt-4 p-2 bg-primary/10 rounded-md flex justify-between items-center">
                  <span className="font-mono text-sm">{collaborator.uniqueCode}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyToClipboard(collaborator.uniqueCode)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full logo font-medium"
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
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
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
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={newCollaborator.email}
                onChange={(e) => setNewCollaborator({...newCollaborator, email: e.target.value})}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label htmlFor="bank">Bank Name</Label>
              <Input 
                id="bank" 
                value={newCollaborator.bankName}
                onChange={(e) => setNewCollaborator({...newCollaborator, bankName: e.target.value})}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label htmlFor="account">Account Number</Label>
              <Input 
                id="account" 
                value={newCollaborator.accountNumber}
                onChange={(e) => setNewCollaborator({...newCollaborator, accountNumber: e.target.value})}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label>Ticket Allocation ({newCollaborator.ticketAllocation})</Label>
              <Slider 
                defaultValue={[newCollaborator.ticketAllocation]} 
                max={totalTickets}
                step={1}
                onValueChange={(value) => setNewCollaborator({...newCollaborator, ticketAllocation: value[0]})}
                className="my-2"
              />
              <p className="text-xs text-muted-foreground">
                Maximum tickets this collaborator can sell: {newCollaborator.ticketAllocation} of {totalTickets}
              </p>
            </div>
            <div>
              <Label>Discount Percentage ({newCollaborator.discountPercentage}%)</Label>
              <Slider 
                defaultValue={[newCollaborator.discountPercentage]} 
                max={20}
                step={1}
                onValueChange={(value) => setNewCollaborator({...newCollaborator, discountPercentage: value[0]})}
                className="my-2"
              />
              <p className="text-xs text-muted-foreground">
                Discount this collaborator can offer: {newCollaborator.discountPercentage}% (max 20%)
              </p>
            </div>
            <div className="pt-4">
              <Button 
                variant="glow" 
                className="w-full logo font-medium"
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
              Share scanner access with {selectedCollaborator?.name} for {eventName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm mb-2">Scanner Link:</p>
              <div className="flex items-center justify-between">
                <code className="text-xs truncate max-w-[200px]">
                  {selectedCollaborator && generateScannerLink(selectedCollaborator.uniqueCode)}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => selectedCollaborator && copyToClipboard(generateScannerLink(selectedCollaborator.uniqueCode))}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-3 bg-primary/10 rounded-md">
              <p className="text-sm mb-2">Access Code:</p>
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono">{selectedCollaborator?.uniqueCode}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => selectedCollaborator && copyToClipboard(selectedCollaborator.uniqueCode)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 logo font-medium"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="glow" 
                className="flex-1 logo font-medium"
                onClick={sendInvite}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventCollaborators;