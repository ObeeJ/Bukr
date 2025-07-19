import { Link, useLocation } from "react-router-dom";
import { Search, Heart, User, LayoutDashboard, Ticket, PlusCircle, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Only show bottom navigation on app routes
  const shouldShow = ["/app", "/favorites", "/events", "/profile", "/create-event", "/dashboard", "/tickets"].some(
    route => location.pathname === route
  );
  
  if (!shouldShow) return null;

  // Define navigation items based on user type
  let navItems = [];
  
  if (user?.userType === 'organizer') {
    // Organizer navigation
    navItems = [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: QrCode, label: "Scan", path: "/events" },
      { icon: PlusCircle, label: "Create", path: "/create-event" },
      { icon: Search, label: "Explore", path: "/app" },
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
      </div>
    </nav>
  );
};

export default BottomNavigation;