// src/pages/Profile.tsx

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Bell, Shield, Settings, LogOut, Camera, BarChart3, ArrowLeft } from "lucide-react";
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
  const { user, logout, updateUser } = useAuth();
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    newPassword: "",
    confirmPassword: "",
    otp: "",
  });

  useEffect(() => {
    // Set previous path from location state or default to /app
    const from = location.state?.from || "/app";
    if (from && !from.includes("/profile")) {
      setPreviousPath(from);
    }
  }, [location.state]);

  const [previousPath, setPreviousPath] = useState<string>("/app");

  const userStats = [
    { label: "Tickets", value: user?.tickets?.length || 4 },
    { label: "Favorites", value: user?.favorites?.length || 7 },
    { label: "Events", value: user?.events?.length || 12 },
  ];

  const menuItems = [
    ...(user?.userType === "organizer"
      ? [
          {
            icon: BarChart3,
            label: "Event Dashboard",
            description: "Monitor your events and ticket sales",
            path: "/dashboard",
          },
        ]
      : []),
    {
      icon: Edit,
      label: "Edit Profile",
      description: "Update your personal information",
      action: () => setActiveDialog("edit-profile"),
    },
    {
      icon: Bell,
      label: "Notifications",
      description: "Manage your notification preferences",
      action: () => setActiveDialog("notifications"),
    },
    {
      icon: Shield,
      label: "Privacy & Security",
      description: "Control your privacy settings",
      action: () => setActiveDialog("privacy"),
    },
    {
      icon: Settings,
      label: "Settings",
      description: "App preferences and more",
      action: () => setActiveDialog("settings"),
    },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 2 * 1024 * 1024) { // Limit to 2MB
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setProfileImage(imageData);
        updateUser({ profileImage: imageData });
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been updated successfully.",
        });
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Error",
        description: "Image file is too large. Please upload an image under 2MB.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const validateForm = () => {
    if (activeDialog === "edit-profile") {
      if (!formData.name.trim() || !formData.email.trim()) {
        toast({
          title: "Error",
          description: "Name and email are required.",
          variant: "destructive",
        });
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        toast({
          title: "Error",
          description: "Invalid email format.",
          variant: "destructive",
        });
        return false;
      }
    } else if (activeDialog === "new-password") {
      if (formData.newPassword.length < 8) {
        toast({
          title: "Error",
          description: "Password must be at least 8 characters long.",
          variant: "destructive",
        });
        return false;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match.",
          variant: "destructive",
        });
        return false;
      }
    } else if (activeDialog === "otp-verification") {
      if (!/^\d{6}$/.test(formData.otp)) {
        toast({
          title: "Error",
          description: "Please enter a valid 6-digit OTP.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      if (activeDialog === "edit-profile") {
        await updateUser({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        });
      } else if (activeDialog === "new-password") {
        // Simulate password update
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      setActiveDialog(null);
      toast({
        title: "Success",
        description: "Your changes have been saved successfully.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordChange = async () => {
    setIsProcessing(true);
    try {
      // Simulate sending OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "OTP Sent",
        description: "A verification code has been sent to your email.",
      });
      setActiveDialog("otp-verification");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOtpVerification = async () => {
    if (!validateForm()) return;

    setIsProcessing(true);
    try {
      // Simulate OTP verification
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setActiveDialog("new-password");
    } catch (err) {
      toast({
        title: "Error",
        description: "Invalid OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate("/");
    toast({
      title: "Signed Out",
      description: "You have been successfully signed out.",
    });
  };

  const handleGoBack = () => {
    navigate(previousPath);
  };

  return (
    <div className="min-h-screen pt-8 pb-24 px-4 responsive-spacing">
      <div className="mb-6">
        <Button variant="ghost" onClick={handleGoBack} className="flex items-center gap-2 hover-glow">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <AnimatedLogo size="sm" />
      </div>

      <div className="text-center mb-8">
        <div className="relative w-24 h-24 mx-auto mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground overflow-hidden">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || "U"
            )}
          </div>
          <label
            htmlFor="profile-upload"
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full cursor-pointer"
          >
            <Button size="icon" variant="outline" className="w-8 h-8 rounded-full hover-glow">
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
        <h1 className="text-2xl font-bold watermark mb-1">{user?.name || "User"}</h1>
        <p className="text-muted-foreground font-montserrat">{user?.email || "user@example.com"}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {userStats.map((stat, index) => (
          <div
            key={stat.label}
            className="glass-card text-center p-4 animate-scale-in hover-glow"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground font-montserrat">{stat.label}</div>
          </div>
        ))}
      </div>

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
                  <h3 className="font-semibold logo">{item.label}</h3>
                  <p className="text-sm text-muted-foreground font-montserrat">{item.description}</p>
                </div>
              </div>
              <div className="text-muted-foreground">→</div>
            </div>
          );

          return item.path ? (
            <Link
              key={item.label}
              to={item.path}
              className="glass-card hover-glow p-4 cursor-pointer animate-fade-in block"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {content}
            </Link>
          ) : (
            <div
              key={item.label}
              className="glass-card hover-glow p-4 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={item.action}
            >
              {content}
            </div>
          );
        })}
      </div>

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
              <h3 className="font-semibold text-destructive logo">Sign Out</h3>
              <p className="text-sm text-muted-foreground font-montserrat">Log out of your account</p>
            </div>
          </div>
          <div className="text-muted-foreground">→</div>
        </div>
      </div>

      <Dialog open={activeDialog === "edit-profile"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="logo">Edit Profile</DialogTitle>
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
                <label
                  htmlFor="dialog-profile-upload"
                  className="absolute -bottom-1 -right-1 cursor-pointer"
                >
                  <Button size="icon" variant="outline" className="w-8 h-8 rounded-full hover-glow">
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
              <Label htmlFor="name" className="font-montserrat">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleInputChange}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label htmlFor="email" className="font-montserrat">Email</Label>
              <Input
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="font-montserrat">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <Button
              variant="glow"
              className="w-full logo font-medium hover-glow"
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "notifications"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="logo">Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium logo">Event Reminders</h4>
                <p className="text-sm text-muted-foreground font-montserrat">Get notified before your events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium logo">New Events</h4>
                <p className="text-sm text-muted-foreground font-montserrat">Get notified about new events</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium logo">Marketing</h4>
                <p className="text-sm text-muted-foreground font-montserrat">Receive promotional emails</p>
              </div>
              <Switch />
            </div>
            <Button
              variant="glow"
              className="w-full logo font-medium hover-glow"
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "privacy"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="logo">Privacy & Security</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h4 className="font-medium logo mb-2">Privacy Policy</h4>
              <p className="text-sm text-muted-foreground font-montserrat mb-4">
                Review our privacy policy to understand how we handle your data.
              </p>
              <Link to="/privacy-policy" state={{ from: location.pathname }}>
                <Button variant="outline" size="sm" className="logo font-medium hover-glow">
                  View Privacy Policy
                </Button>
              </Link>
            </div>
            <div className="glass-card p-4">
              <h4 className="font-medium logo mb-2">Change Password</h4>
              <Button
                variant="outline"
                size="sm"
                className="w-full logo font-medium hover-glow"
                onClick={handlePasswordChange}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Update Password"}
              </Button>
            </div>
            <div className="glass-card p-4">
              <h4 className="font-medium logo mb-2">Two-Factor Authentication</h4>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-montserrat">
                  Enable 2FA for added security
                </p>
                <Switch />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "otp-verification"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="logo">Verify OTP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-montserrat">
              Enter the 6-digit verification code sent to your email.
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Input
                  key={i}
                  id="otp"
                  className="w-10 h-12 text-center text-lg glass-card border-glass-border bg-glass/20"
                  maxLength={1}
                  value={formData.otp[i - 1] || ""}
                  onChange={(e) => {
                    const newOtp = formData.otp.split("");
                    newOtp[i - 1] = e.target.value;
                    setFormData({ ...formData, otp: newOtp.join("") });
                    if (e.target.value && i < 6) {
                      document.getElementById(`otp-${i + 1}`)?.focus();
                    }
                  }}
                />
              ))}
            </div>
            <Button
              variant="glow"
              className="w-full logo font-medium hover-glow"
              onClick={handleOtpVerification}
              disabled={isProcessing}
            >
              {isProcessing ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "new-password"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="logo">Set New Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="font-montserrat">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="font-montserrat">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
            <Button
              variant="glow"
              className="w-full logo font-medium hover-glow"
              onClick={handleSaveChanges}
              disabled={isProcessing}
            >
              {isProcessing ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "settings"} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="glass-card border-glass-border max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="logo">App Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium logo">Push Notifications</h4>
                <p className="text-sm text-muted-foreground font-montserrat">
                  Enable push notifications
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div>
              <Label htmlFor="language" className="font-montserrat">Language</Label>
              <select
                id="language"
                className="w-full glass-card border-glass-border bg-glass/20 p-2 rounded-md"
                defaultValue="en"
                onChange={handleInputChange}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>
            <Button
              variant="glow"
              className="w-full logo font-medium hover-glow"
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