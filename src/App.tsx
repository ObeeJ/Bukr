// src/App.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import { EventProvider } from "@/contexts/EventContext";
import { TicketProvider } from "@/contexts/TicketContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import BottomNavigation from "@/components/BottomNavigation";
import MobileGuard from "@/components/MobileGuard";
import { toast } from "sonner";
import { lazy, Suspense, useEffect, Component, ReactNode } from "react";
import { useLocation } from "react-router-dom";

// Catches unhandled render errors so a single broken page can't crash the whole app.
// Shows a minimal recovery UI instead of a blank white screen.
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
          <p className="text-2xl font-bold watermark">Something went wrong</p>
          <p className="text-muted-foreground font-montserrat">Refresh the page to continue.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.href = '/#/app'; }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Core pages
const Landing              = lazy(() => import("@/pages/Landing"));
const Auth                 = lazy(() => import("@/pages/Auth"));
const ResetPassword        = lazy(() => import("@/pages/ResetPassword"));
const NotFound             = lazy(() => import("@/pages/NotFound"));
const PrivacyPolicy        = lazy(() => import("@/pages/PrivacyPolicy"));

// User pages
const UserDashboard        = lazy(() => import("@/pages/UserDashboard"));
const Explore              = lazy(() => import("@/pages/Explore"));
const Favorites            = lazy(() => import("@/pages/Favorites"));
const Tickets              = lazy(() => import("@/pages/Tickets"));
const Profile              = lazy(() => import("@/pages/Profile"));
const NotificationPreferences = lazy(() => import("@/pages/NotificationPreferences"));
const EventDetail          = lazy(() => import("@/pages/EventDetail"));
const PaymentVerify        = lazy(() => import("@/pages/PaymentVerify"));
const PurchasePage         = lazy(() => import("@/pages/PurchasePage"));
const ScannerPage          = lazy(() => import("@/pages/ScannerPage"));

// Organizer pages
const Events               = lazy(() => import("@/pages/Events"));
const MyEvents             = lazy(() => import("@/pages/MyEvents"));
const Influencers          = lazy(() => import("@/pages/Influencers"));
const CreateEvent          = lazy(() => import("@/pages/CreateEvent"));
const EventDashboard       = lazy(() => import("@/pages/EventDashboard"));
const ScannerManagement    = lazy(() => import("@/pages/ScannerManagement"));

// Vendor pages
const VendorMarketplace    = lazy(() => import("@/pages/vendors/VendorMarketplace"));
const VendorProfile        = lazy(() => import("@/pages/vendors/VendorProfile"));
const VendorRegister       = lazy(() => import("@/pages/vendors/VendorRegister"));
const VendorDashboard      = lazy(() => import("@/pages/vendors/VendorDashboard"));
const EventVendors         = lazy(() => import("@/pages/vendors/EventVendors"));

// Influencer portal
const InfluencerDashboard  = lazy(() => import("@/pages/influencer/InfluencerDashboard"));
const InfluencerPayouts    = lazy(() => import("@/pages/influencer/InfluencerPayouts"));
const InfluencerClaim      = lazy(() => import("@/pages/influencer/InfluencerClaim"));

// Organizer credits
const CreditsPage          = lazy(() => import("@/pages/organizer/CreditsPage"));

// Invite redemption (public deep-link — auth handled inside the page)
const InviteRedeemPage     = lazy(() => import("@/pages/InviteRedeemPage"));

// Admin dashboard
const AdminLayout          = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverview        = lazy(() => import("@/pages/admin/sections/AdminOverview"));
const AdminUsers           = lazy(() => import("@/pages/admin/sections/AdminUsers"));
const AdminEvents          = lazy(() => import("@/pages/admin/sections/AdminEvents"));
const AdminTickets         = lazy(() => import("@/pages/admin/sections/AdminTickets"));
const AdminFinance         = lazy(() => import("@/pages/admin/sections/AdminFinance"));
const AdminOrganizers      = lazy(() => import("@/pages/admin/sections/AdminOrganizers"));
const AdminVendors         = lazy(() => import("@/pages/admin/sections/AdminVendors"));
const AdminInfluencers     = lazy(() => import("@/pages/admin/sections/AdminInfluencers"));
const AdminSystem          = lazy(() => import("@/pages/admin/sections/AdminSystem"));
const AdminPayments        = lazy(() => import("@/pages/admin/sections/AdminPayments"));
const AdminAuditLog        = lazy(() => import("@/pages/admin/sections/AdminAuditLog"));
const AdminDisputes        = lazy(() => import("@/pages/admin/sections/AdminDisputes"));
const AdminFeedback        = lazy(() => import("@/pages/admin/sections/AdminFeedback"));
const AdminWaitlist        = lazy(() => import("@/pages/admin/sections/AdminWaitlist"));
const AdminPromos          = lazy(() => import("@/pages/admin/sections/AdminPromos"));
const AdminScanLogs        = lazy(() => import("@/pages/admin/sections/AdminScanLogs"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 5 * 60 * 1000 } },
});

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredUserType?: "user" | "organizer" | "admin";
}

const ProtectedRoute = ({ children, requiredUserType }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Toast must live in useEffect — render phase must be pure.
  // Calling toast() directly in render fires twice in React 18 StrictMode.
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      toast.error("Authentication Required", { description: "Please sign in to access this page." });
    } else if (requiredUserType && user?.userType !== requiredUserType) {
      toast.error("Access Denied", { description: `This page is restricted to ${requiredUserType}s only.` });
    }
  }, [isLoading, isAuthenticated, user?.userType, requiredUserType]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (user?.isActive === false) return <Navigate to="/auth" replace />;
  if (requiredUserType && user?.userType !== requiredUserType) return <Navigate to="/app" replace />;

  return children;
};

const ScannerRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { search } = useLocation();
  const isOrganizer = user?.userType === "organizer";
  // Access code must be in format ORG-XXXXXX (hex) — read reactively via useLocation
  const hasAccessCode = /code=ORG-[0-9A-F]{6}/.test(search);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !hasAccessCode) {
      toast.error("Authentication Required", { description: "Please sign in to access the scanner." });
    } else if (!isOrganizer && !hasAccessCode) {
      toast.error("Access Denied", { description: "Only organizers or users with a valid access code can use the scanner." });
    }
  }, [isLoading, isAuthenticated, isOrganizer, hasAccessCode]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated && !hasAccessCode) return <Navigate to="/auth" replace />;
  if (!isOrganizer && !hasAccessCode) return <Navigate to="/app" replace />;

  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Suspense fallback={null}><Landing /></Suspense>} />
    <Route path="/auth" element={<Suspense fallback={null}><Auth /></Suspense>} />
    <Route path="/signin" element={<Navigate to="/auth" replace />} />
    <Route path="/signup" element={<Navigate to="/auth?tab=signup" replace />} />
    <Route path="/reset-password" element={<Suspense fallback={null}><ResetPassword /></Suspense>} />
    <Route path="/privacy-policy" element={<Suspense fallback={null}><PrivacyPolicy /></Suspense>} />
    <Route path="/invite" element={<Suspense fallback={null}><InviteRedeemPage /></Suspense>} />
    <Route path="/vendors" element={<Suspense fallback={null}><VendorMarketplace /></Suspense>} />
    <Route path="/vendors/:id" element={<Suspense fallback={null}><VendorProfile /></Suspense>} />
    <Route path="/influencer/claim/:token" element={<Suspense fallback={null}><InfluencerClaim /></Suspense>} />

    <Route element={<AppLayout />}>
        <Route path="/app" element={<ProtectedRoute><Suspense fallback={null}><UserDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><Suspense fallback={null}><Explore /></Suspense></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><Suspense fallback={null}><Favorites /></Suspense></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><Suspense fallback={null}><Tickets /></Suspense></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Suspense fallback={null}><Profile /></Suspense></ProtectedRoute>} />
        <Route path="/notification-preferences" element={<ProtectedRoute><Suspense fallback={null}><NotificationPreferences /></Suspense></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><Events /></Suspense></ProtectedRoute>} />
        <Route path="/myevents" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><MyEvents /></Suspense></ProtectedRoute>} />
        <Route path="/influencers" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><Influencers /></Suspense></ProtectedRoute>} />
        <Route path="/create-event" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><CreateEvent /></Suspense></ProtectedRoute>} />
        <Route path="/create-event/:id" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><CreateEvent /></Suspense></ProtectedRoute>} />
        <Route path="/events/:id/edit" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><CreateEvent /></Suspense></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><EventDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/events/:eventId/scanners" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><ScannerManagement /></Suspense></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><Suspense fallback={null}><EventDetail /></Suspense></ProtectedRoute>} />
        <Route path="/payment/verify/:reference" element={<ProtectedRoute><Suspense fallback={null}><PaymentVerify /></Suspense></ProtectedRoute>} />
        <Route path="/purchase/:eventKey" element={<ProtectedRoute><Suspense fallback={null}><PurchasePage /></Suspense></ProtectedRoute>} />
        <Route path="/scan/:eventId" element={<ScannerRoute><Suspense fallback={null}><ScannerPage /></Suspense></ScannerRoute>} />
        <Route path="/scan/key/:eventKey" element={<ScannerRoute><Suspense fallback={null}><ScannerPage /></Suspense></ScannerRoute>} />
        <Route path="/vendor/register" element={<ProtectedRoute><Suspense fallback={null}><VendorRegister /></Suspense></ProtectedRoute>} />
        <Route path="/vendor-dashboard" element={<ProtectedRoute><Suspense fallback={null}><VendorDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/events/:eventId/vendors" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><EventVendors /></Suspense></ProtectedRoute>} />
        <Route path="/influencer" element={<ProtectedRoute><Suspense fallback={null}><InfluencerDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/influencer/payouts" element={<ProtectedRoute><Suspense fallback={null}><InfluencerPayouts /></Suspense></ProtectedRoute>} />
        <Route path="/credits" element={<ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><CreditsPage /></Suspense></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredUserType="admin"><Suspense fallback={null}><AdminLayout /></Suspense></ProtectedRoute>}>
          <Route index element={<Suspense fallback={null}><AdminOverview /></Suspense>} />
          <Route path="users" element={<Suspense fallback={null}><AdminUsers /></Suspense>} />
          <Route path="events" element={<Suspense fallback={null}><AdminEvents /></Suspense>} />
          <Route path="tickets" element={<Suspense fallback={null}><AdminTickets /></Suspense>} />
          <Route path="finance" element={<Suspense fallback={null}><AdminFinance /></Suspense>} />
          <Route path="organizers" element={<Suspense fallback={null}><AdminOrganizers /></Suspense>} />
          <Route path="vendors" element={<Suspense fallback={null}><AdminVendors /></Suspense>} />
          <Route path="influencers" element={<Suspense fallback={null}><AdminInfluencers /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={null}><AdminPayments /></Suspense>} />
          <Route path="disputes" element={<Suspense fallback={null}><AdminDisputes /></Suspense>} />
          <Route path="audit-log" element={<Suspense fallback={null}><AdminAuditLog /></Suspense>} />
          <Route path="feedback" element={<Suspense fallback={null}><AdminFeedback /></Suspense>} />
          <Route path="waitlist" element={<Suspense fallback={null}><AdminWaitlist /></Suspense>} />
          <Route path="promos" element={<Suspense fallback={null}><AdminPromos /></Suspense>} />
          <Route path="scan-logs" element={<Suspense fallback={null}><AdminScanLogs /></Suspense>} />
          <Route path="system" element={<Suspense fallback={null}><AdminSystem /></Suspense>} />
        </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner richColors />
      <MobileGuard>
        <HashRouter>
          <AuthProvider>
            <EventProvider>
              <TicketProvider>
                <NotificationProvider>
                  <div className="relative">
                    <ErrorBoundary>
                      <AppRoutes />
                    </ErrorBoundary>
                    <BottomNavigation />
                  </div>
                </NotificationProvider>
              </TicketProvider>
            </EventProvider>
          </AuthProvider>
        </HashRouter>
      </MobileGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
