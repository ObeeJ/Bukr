import { Link, useLocation, useMatch } from "react-router-dom";
import { Search, Heart, Calendar, User, Plus, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateEventButton from "@/components/CreateEventButton";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedLogo from "./AnimatedLogo";

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Only show bottom navigation on app routes
  const shouldShow = ["/app", "/favorites", "/events", "/profile", "/create-event", "/dashboard"].some(
    route => location.pathname === route
  );
  
  if (!shouldShow) return null;

  // Base navigation items
  let navItems = [
    { icon: Search, label: "Explore", path: "/app" },
    { icon: Heart, label: "Favorites", path: "/favorites" },
    { icon: Calendar, label: "My Events", path: "/events" },
  ];
  
  // Add Dashboard for organizers
  if (user?.userType === 'organizer') {
    navItems.push({ icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" });
  }
  
  // Add Profile for all users
  navItems.push({ icon: User, label: "Profile", path: "/profile" });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border border-border/30 mx-4 mb-4 rounded-2xl animate-slide-up shadow-lg">
      <div className="flex items-center justify-around py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300",
                isActive 
                  ? "text-primary bg-primary/10 scale-110" 
                  : "text-muted-foreground hover:text-foreground hover:bg-glass/20"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium logo">{item.label}</span>
            </Link>
          );
        })}
        {user?.userType === 'organizer' && (
          <CreateEventButton 
            variant="ghost" 
            size="sm" 
            compact={true}
            className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-glass/20 h-auto"
          />
        )}
      </div>
    </nav>
  );
};

export default BottomNavigation;