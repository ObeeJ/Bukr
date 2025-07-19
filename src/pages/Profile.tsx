import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Bell, CreditCard, Shield, Settings, LogOut, Camera, BarChart3 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const Profile = () => {
  const navigate = useNavigate();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  
  const userStats = [
    { label: "Events", value: "15" },
    { label: "Favorites", value: "2" },
    { label: "Rating", value: "4.9" }
  ];

  const menuItems = [
    { icon: BarChart3, label: "Event Dashboard", description: "Monitor your events and ticket sales", path: "/dashboard" },
    { icon: Edit, label: "Edit Profile", description: "Update your personal information", action: () => setActiveDialog("edit-profile") },
    { icon: Bell, label: "Notifications", description: "Manage your notification preferences", action: () => setActiveDialog("notifications") },
    { icon: CreditCard, label: "Payment Methods", description: "Manage cards and payment options", action: () => setActiveDialog("payment") },
    { icon: Shield, label: "Privacy & Security", description: "Control your privacy settings", action: () => setActiveDialog("privacy") },
    { icon: Settings, label: "Settings", description: "App preferences and more", action: () => setActiveDialog("settings") },
  ];

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
            AJ
          </div>
          <Button 
            size="icon" 
            variant="outline" 
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
          >
            <Camera className="w-4 h-4" />
          </Button>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-1">Alex Johnson</h1>
        <p className="text-muted-foreground">Member since March 2024</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {userStats.map((stat, index) => (
          <div 
            key={stat.label} 
            className="glass-card text-center p-4 animate-scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Items */}
      <div className="space-y-4 mb-8">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const content = (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.label}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="text-muted-foreground">
                →
              </div>
            </div>
          );
          
          if (item.path) {
            return (
              <Link
                key={item.label}
                to={item.path}
                className="glass-card hover-glow p-4 cursor-pointer animate-fade-in block"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {content}
              </Link>
            );
          } else if (item.action) {
            return (
              <div 
                key={item.label}
                className="glass-card hover-glow p-4 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={item.action}
              >
                {content}
              </div>
            );
          } else {
            return (
              <div 
                key={item.label}
                className="glass-card hover-glow p-4 cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {content}
              </div>
            );
          }
        })}
      </div>

      {/* Sign Out */}
      <div 
        className="glass-card hover-glow p-4 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/30 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive">Sign Out</h3>
              <p className="text-sm text-muted-foreground">Log out of your account</p>
            </div>
          </div>
          <div className="text-muted-foreground">
            →
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={activeDialog === "edit-profile"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
                  AJ
                </div>
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="Alex Johnson" className="glass-card border-glass-border bg-glass/20" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue="alex@example.com" className="glass-card border-glass-border bg-glass/20" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue="+1 (555) 123-4567" className="glass-card border-glass-border bg-glass/20" />
            </div>
            <Button variant="glow" className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={activeDialog === "notifications"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Event Reminders</h4>
                <p className="text-sm text-muted-foreground">Get notified before your events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">New Events</h4>
                <p className="text-sm text-muted-foreground">Get notified about new events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Marketing</h4>
                <p className="text-sm text-muted-foreground">Receive promotional emails</p>
              </div>
              <Switch />
            </div>
            <Button variant="glow" className="w-full">Save Preferences</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Methods Dialog */}
      <Dialog open={activeDialog === "payment"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Payment Methods</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-blue-600 rounded-md flex items-center justify-center text-white text-xs font-bold">VISA</div>
                <div>
                  <p className="font-medium">•••• 4242</p>
                  <p className="text-xs text-muted-foreground">Expires 12/25</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">Remove</Button>
            </div>
            <Button variant="outline" className="w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link to Privacy Policy */}
      <Dialog open={activeDialog === "privacy"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Privacy & Security</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h4 className="font-medium mb-2">Privacy Policy</h4>
              <p className="text-sm text-muted-foreground mb-4">Review our privacy policy to understand how we handle your data.</p>
              <Link to="/privacy-policy">
                <Button variant="outline" size="sm">View Privacy Policy</Button>
              </Link>
            </div>
            <div className="glass-card p-4">
              <h4 className="font-medium mb-2">Change Password</h4>
              <Button variant="outline" size="sm" className="w-full">Update Password</Button>
            </div>
            <div className="glass-card p-4">
              <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Enable 2FA for added security</p>
                <Switch />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={activeDialog === "settings"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>App Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Dark Mode</h4>
                <p className="text-sm text-muted-foreground">Toggle dark/light theme</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Push Notifications</h4>
                <p className="text-sm text-muted-foreground">Enable push notifications</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <select 
                id="language" 
                className="w-full glass-card border-glass-border bg-glass/20 p-2 rounded-md"
                defaultValue="en"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <Button variant="glow" className="w-full">Save Settings</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;