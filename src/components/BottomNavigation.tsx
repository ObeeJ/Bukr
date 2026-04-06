import { Link, useLocation } from "react-router-dom";
import { Search, Heart, User, LayoutDashboard, Ticket, PlusCircle, QrCode, Users, Store, TrendingUp, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";

const BottomNavigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  const HIDE_NAV_ROUTES = ["/", "/auth", "/signin", "/signup", "/reset-password", "/privacy-policy"];
  const isHiddenRoute =
    HIDE_NAV_ROUTES.includes(location.pathname) ||
    location.pathname.startsWith("/scan/") ||
    location.pathname.startsWith("/influencer/claim/") ||
    location.pathname.startsWith("/vendors/") ||
    location.pathname === "/vendors";

  if (isHiddenRoute || !user) return null;

  // Nav items per user type — every backend user type gets its own nav.
  // Admin gets no bottom nav (they use the sidebar in AdminLayout).
  const NAV_BY_TYPE: Record<string, { icon: React.ElementType; label: string; path: string }[]> = {
    organizer: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      { icon: QrCode,          label: "Events",    path: "/events" },
      { icon: Users,           label: "Influencers",path: "/influencers" },
      { icon: PlusCircle,      label: "Create",    path: "/create-event" },
      { icon: User,            label: "Profile",   path: "/profile" },
    ],
    vendor: [
      { icon: Store,           label: "Dashboard", path: "/vendor-dashboard" },
      { icon: Search,          label: "Marketplace",path: "/vendors" },
      { icon: User,            label: "Profile",   path: "/profile" },
    ],
    influencer: [
      { icon: TrendingUp,      label: "Portal",    path: "/influencer" },
      { icon: Ticket,          label: "Payouts",   path: "/influencer/payouts" },
      { icon: User,            label: "Profile",   path: "/profile" },
    ],
    // Admin uses the full sidebar — no bottom nav needed
    admin: [],
    user: [
      { icon: Search,          label: "Explore",   path: "/app" },
      { icon: Heart,           label: "Favorites", path: "/favorites" },
      { icon: Ticket,          label: "Tickets",   path: "/tickets" },
      { icon: User,            label: "Profile",   path: "/profile" },
    ],
  };

  const navItems = NAV_BY_TYPE[user.userType] ?? NAV_BY_TYPE.user;

  // Admin has their own sidebar — skip bottom nav entirely
  if (user.userType === 'admin') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/30 safe-area-pb">
      <div className="flex items-center justify-around py-2 sm:py-3 px-2 max-w-md mx-auto relative">
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
        {/* Bell floats at the right edge — panel opens upward */}
        <div className="flex flex-col items-center gap-1 p-2 sm:p-3 min-h-[48px] min-w-[48px]">
          <NotificationBell userEmail={user?.email ?? ''} />
          <span className="text-xs sm:text-sm font-medium logo leading-tight text-muted-foreground">Alerts</span>
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;