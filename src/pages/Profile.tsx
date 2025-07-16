import { Button } from "@/components/ui/button";
import { Edit, Bell, CreditCard, Shield, Settings, LogOut, Camera, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";

const Profile = () => {
  const userStats = [
    { label: "Events", value: "15" },
    { label: "Favorites", value: "2" },
    { label: "Rating", value: "4.9" }
  ];

  const menuItems = [
    { icon: BarChart3, label: "Event Dashboard", description: "Monitor your events and ticket sales", path: "/dashboard" },
    { icon: Edit, label: "Edit Profile", description: "Update your personal information" },
    { icon: Bell, label: "Notifications", description: "Manage your notification preferences" },
    { icon: CreditCard, label: "Payment Methods", description: "Manage cards and payment options" },
    { icon: Shield, label: "Privacy & Security", description: "Control your privacy settings" },
    { icon: Settings, label: "Settings", description: "App preferences and more" },
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
            >
              {content}
            </div>
          );
        })
      </div>

      {/* Sign Out */}
      <div className="glass-card hover-glow p-4 cursor-pointer">
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
    </div>
  );
};

export default Profile;