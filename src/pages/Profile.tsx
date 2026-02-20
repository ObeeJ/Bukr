import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/api/users';
import { toast } from 'sonner';

import { deactivateAccount } from '@/api/users';
import { validatePhone } from '@/utils/validation';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    orgName: user?.orgName || ''
  });

  const handleSave = async () => {
    if (formData.phone && !validatePhone(formData.phone)) {
      toast.error('Invalid phone number format');
      return;
    }
    
    setIsSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        phone: formData.phone || undefined,
        orgName: formData.orgName || undefined,
      });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateAccount();
      toast.success('Account deactivated');
      signOut();
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate account');
    }
  };

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen p-4 safe-area-pb">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(user?.userType === 'organizer' ? '/dashboard' : '/app')}
            className="mr-3"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                placeholder="+234 XXX XXX XXXX"
              />
            </div>

            {user?.userType === 'organizer' && (
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 pt-4">
              <div className="flex items-center px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
                {user?.userType === 'organizer' ? <Building className="mr-1 h-4 w-4" /> : <User className="mr-1 h-4 w-4" />}
                {user?.userType === 'organizer' ? 'Event Organizer' : 'Event Attendee'}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} variant="glow" className="flex-1 cta" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="flex-1">
                  Edit Profile
                </Button>
              )}
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleSignOut} variant="destructive" className="w-full mb-3">
                Sign Out
              </Button>
              <Button 
                onClick={() => setShowDeactivateDialog(true)} 
                variant="outline" 
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Deactivate Account
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to deactivate your account? This action will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Disable your login access</li>
                  <li>Hide your profile from other users</li>
                  <li>Preserve your data for audit purposes</li>
                </ul>
                <p className="mt-2 font-semibold">This action cannot be easily undone.</p>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeactivate} className="w-full sm:w-auto">
                Deactivate Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Profile;
