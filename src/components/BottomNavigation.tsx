import { Link, useLocation } from "react-router-dom";
import { Search, Heart, Calendar, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import CreateEventButton from "@/components/CreateEventButton";

const BottomNavigation = () => {
  const location = useLocation();

  const navItems = [
    { icon: Search, label: "Explore", path: "/app" },
    { icon: Heart, label: "Favorites", path: "/favorites" },
    { icon: Calendar, label: "My Events", path: "/events" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card mx-4 mb-4 rounded-2xl">
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
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
        <CreateEventButton 
          variant="ghost" 
          size="sm" 
          compact={true}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 text-muted-foreground hover:text-foreground hover:bg-glass/20 h-auto"
        />
      </div>
    </nav>
  );
};

export default BottomNavigation;