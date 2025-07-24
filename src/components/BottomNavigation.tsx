import { Link, useLocation } from "react-router-dom";
import { Search, Heart, User, LayoutDashboard, Ticket, PlusCircle, QrCode, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Only show bottom navigation on app routes
  const shouldShow = ["/app", "/favorites", "/events", "/profile", "/create-event", "/dashboard", "/tickets", "/influencers"].some(
    route => location.pathname === route
  );
  
  if (!shouldShow) return null;

  // Define navigation items based on user type
  let navItems = [];
  
  if (user?.userType === 'organizer') {
    // Organizer navigation
    navItems = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: QrCode, label: "Events", path: "/events" },
      { icon: Users, label: "Influencers", path: "/influencers" },
      { icon: PlusCircle, label: "Create", path: "/create-event" },
      { icon: User, label: "Profile", path: "/profile" },
    ];
  } else {
    // Regular user navigation
    navItems = [
      { icon: Search, label: "Explore", path: "/app" },
      { icon: Heart, label: "Favorites", path: "/favorites" },
      { icon: Ticket, label: "Tickets", path: "/tickets" },
      { icon: User, label: "Profile", path: "/profile" },
    ];
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/30 safe-area-pb">
      <div className="flex items-center justify-around py-2 sm:py-3 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-xl transition-all duration-200 min-h-[48px] min-w-[48px] touch-target",
                isActive 
                  ? "text-primary bg-primary/10 scale-105" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50 active:scale-95"
              )}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm font-medium logo leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;