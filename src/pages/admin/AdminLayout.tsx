import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, CalendarDays, Ticket, DollarSign,
  Building2, Store, Users2, Settings, ChevronRight,
  CreditCard, ClipboardList, Scale,
} from "lucide-react";

const NAV = [
  { to: "/admin",              icon: <LayoutDashboard className="h-4 w-4" />, label: "Overview",     end: true },
  { to: "/admin/users",        icon: <Users className="h-4 w-4" />,          label: "Users" },
  { to: "/admin/events",       icon: <CalendarDays className="h-4 w-4" />,   label: "Events" },
  { to: "/admin/tickets",      icon: <Ticket className="h-4 w-4" />,         label: "Tickets" },
  { to: "/admin/finance",      icon: <DollarSign className="h-4 w-4" />,     label: "Finance" },
  { to: "/admin/payments",     icon: <CreditCard className="h-4 w-4" />,     label: "Payments" },
  { to: "/admin/organizers",   icon: <Building2 className="h-4 w-4" />,      label: "Organizers" },
  { to: "/admin/vendors",      icon: <Store className="h-4 w-4" />,          label: "Vendors" },
  { to: "/admin/influencers",  icon: <Users2 className="h-4 w-4" />,         label: "Influencers" },
  { to: "/admin/disputes",     icon: <Scale className="h-4 w-4" />,          label: "Disputes" },
  { to: "/admin/audit-log",    icon: <ClipboardList className="h-4 w-4" />,  label: "Audit Log" },
  { to: "/admin/system",       icon: <Settings className="h-4 w-4" />,       label: "System" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar — hidden on mobile, always visible on desktop */}
      <aside className="hidden md:flex flex-col w-52 border-r border-border/40 bg-background/80 backdrop-blur-sm py-6 shrink-0">
        <div className="px-4 mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Panel</p>
          <p className="text-lg font-clash font-bold text-glow mt-0.5">Bukr HQ</p>
        </div>
        <nav className="flex-1 px-2 space-y-0.5">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-primary/15 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur border-b border-border/40 px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
