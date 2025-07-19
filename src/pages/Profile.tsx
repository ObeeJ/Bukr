import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Bell, CreditCard, Shield, Settings, LogOut, Camera, BarChart3, ArrowLeft } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import AnimatedLogo from "@/components/AnimatedLogo";

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previousPath, setPreviousPath] = useState<string>("/app");
  
  useEffect(() => {
    // Store the previous path when navigating to this page
    const referrer = document.referrer;
    if (referrer && !referrer.includes("/profile")) {
      const url = new URL(referrer);
      setPreviousPath(url.pathname);
    }
  }, []);

  const userStats = [
    { label: "Tickets", value: "4" },
    { label: "Favorites", value: "7" },
    { label: "Events", value: "12" }
  ];

  // Filter menu items based on user type
  const getMenuItems = () => {
    const baseItems = [
      { icon: Edit, label: "Edit Profile", description: "Update your personal information", action: () => setActiveDialog("edit-profile") },
      { icon: Bell, label: "Notifications", description: "Manage your notification preferences", action: () => setActiveDialog("notifications") },
      { icon: CreditCard, label: "Payment Methods", description: "Manage cards and payment options", action: () => setActiveDialog("payment") },
      { icon: Shield, label: "Privacy & Security", description: "Control your privacy settings", action: () => setActiveDialog("privacy") },
      { icon: Settings, label: "Settings", description: "App preferences and more", action: () => setActiveDialog("settings") },
    ];
    
    // Add organizer-specific items
    if (user?.userType === 'organizer') {
      return [
        { icon: BarChart3, label: "Event Dashboard", description: "Monitor your events and ticket sales", path: "/dashboard" },
        ...baseItems
      ];
    }
    
    return baseItems;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveChanges = () => {
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setActiveDialog(null);
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
    }, 1000);
  };

  const handlePasswordChange = () => {
    setIsProcessing(true);
    
    // Simulate OTP sending
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "OTP Sent",
        description: "A verification code has been sent to your email.",
      });
      setActiveDialog("otp-verification");
    }, 1000);
  };

  const handleOtpVerification = () => {
    setIsProcessing(true);
    
    // Simulate verification
    setTimeout(() => {
      setIsProcessing(false);
      setActiveDialog("new-password");
    }, 1000);
  };

  const handlePaystackIntegration = () => {
    setIsProcessing(true);
    
    // Simulate Paystack integration
    setTimeout(() => {
      setIsProcessing(false);
      toast({
        title: "Card Added",
        description: "Your payment method has been added successfully.",
      });
      setActiveDialog(null);
    }, 1000);
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(previousPath);
  };

  return (
    <div className="min-h-screen pt-8 pb-24 px-4">
      {/* Back Button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={handleGoBack} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
      </div>
      
      {/* Logo */}
      <div className="flex items-center gap-2 mb-6">
        <AnimatedLogo size="sm" />
      </div>

      {/* Profile Header */}
      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground overflow-hidden">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || "U"
            )}
          </div>
          <label htmlFor="profile-upload" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full cursor-pointer">
            <Button 
              size="icon" 
              variant="outline" 
              className="w-8 h-8 rounded-full"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <input 
              id="profile-upload" 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload}
            />
          </label>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-1">{user?.name || "User"}</h1>
        <p className="text-muted-foreground">{user?.email || "user@example.com"}</p>
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
        {getMenuItems().map((item, index) => {
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
        onClick={handleSignOut}
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
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0) || "U"
                  )}
                </div>
                <label htmlFor="dialog-profile-upload" className="absolute -bottom-1 -right-1 cursor-pointer">
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="w-8 h-8 rounded-full"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                  <input 
                    id="dialog-profile-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={user?.name || ""} className="glass-card border-glass-border bg-glass/20" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user?.email || ""} className="glass-card border-glass-border bg-glass/20" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue="" className="glass-card border-glass-border bg-glass/20" />
            </div>
            <Button 
              variant="glow" 
              className="w-full logo font-medium" 
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
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
            <Button 
              variant="glow" 
              className="w-full logo font-medium"
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Saving..." : "Save Preferences"}
            </Button>
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
            <Button 
              variant="outline" 
              className="w-full logo font-medium"
              onClick={handlePaystackIntegration}
              disabled={isProcessing}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isProcessing ? "Processing..." : "Add Paystack Card"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy & Security Dialog */}
      <Dialog open={activeDialog === "privacy"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Privacy & Security</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h4 className="font-medium mb-2">Privacy Policy</h4>
              <p className="text-sm text-muted-foreground mb-4">Review our privacy policy to understand how we handle your data.</p>
              <Link to="/privacy-policy" state={{ from: location.pathname }}>
                <Button variant="outline" size="sm" className="logo font-medium">View Privacy Policy</Button>
              </Link>
            </div>
            <div className="glass-card p-4">
              <h4 className="font-medium mb-2">Change Password</h4>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full logo font-medium"
                onClick={handlePasswordChange}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Update Password"}
              </Button>
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

      {/* OTP Verification Dialog */}
      <Dialog open={activeDialog === "otp-verification"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Verify OTP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Enter the verification code sent to your email.</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Input 
                  key={i}
                  className="w-10 h-12 text-center text-lg glass-card border-glass-border bg-glass/20" 
                  maxLength={1}
                />
              ))}
            </div>
            <Button 
              variant="glow" 
              className="w-full logo font-medium"
              onClick={handleOtpVerification}
              disabled={isProcessing}
            >
              {isProcessing ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Password Dialog */}
      <Dialog open={activeDialog === "new-password"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Set New Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" className="glass-card border-glass-border bg-glass/20" />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" className="glass-card border-glass-border bg-glass/20" />
            </div>
            <Button 
              variant="glow" 
              className="w-full logo font-medium"
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Updating..." : "Update Password"}
            </Button>
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
            <Button 
              variant="glow" 
              className="w-full logo font-medium"
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;