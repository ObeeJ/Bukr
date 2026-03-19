// src/App.tsx

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { BookingProvider } from "@/contexts/BookingContext";
import { EventProvider } from "@/contexts/EventContext";
import { TicketProvider } from "@/contexts/TicketContext";
import Landing from "@/pages/Landing";
import SignIn from "@/pages/SignIn";
import SignUp from "@/pages/SignUp";
import Explore from "@/pages/Explore";
import Favorites from "@/pages/Favorites";
import MyEvents from "@/pages/MyEvents";
import Events from "@/pages/Events";
import Influencers from "@/pages/Influencers";
import Profile from "@/pages/Profile";
import CreateEvent from "@/pages/CreateEvent";
import EventDashboard from "@/pages/EventDashboard";
import EventDetail from "@/pages/EventDetail";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import NotFound from "@/pages/NotFound";
import Tickets from "@/pages/Tickets";
import ScannerPage from "@/pages/ScannerPage";
import PaymentVerify from "@/pages/PaymentVerify";
import UserDashboard from "@/pages/UserDashboard";
import PurchasePage from "@/pages/PurchasePage";
import BottomNavigation from "@/components/BottomNavigation";
import MobileGuard from "@/components/MobileGuard";
import { useToast } from "@/components/ui/use-toast";

import ScannerManagement from "@/pages/ScannerManagement";
import ResetPassword from "@/pages/ResetPassword";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import { lazy, Suspense } from "react";

// Vendor pages (lazy-loaded — not in the critical bundle)
const VendorMarketplace = lazy(() => import("@/pages/vendors/VendorMarketplace"));
const VendorProfile = lazy(() => import("@/pages/vendors/VendorProfile"));
const VendorRegister = lazy(() => import("@/pages/vendors/VendorRegister"));
const VendorDashboard = lazy(() => import("@/pages/vendors/VendorDashboard"));
const EventVendors = lazy(() => import("@/pages/vendors/EventVendors"));

// Influencer portal (lazy-loaded)
const InfluencerDashboard = lazy(() => import("@/pages/influencer/InfluencerDashboard"));
const InfluencerPayouts = lazy(() => import("@/pages/influencer/InfluencerPayouts"));
const InfluencerClaim = lazy(() => import("@/pages/influencer/InfluencerClaim"));

// Organizer credits (lazy-loaded)
const CreditsPage = lazy(() => import("@/pages/organizer/CreditsPage"));

// Admin dashboard (lazy-loaded — large chunk, admin-only)
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout"));
const AdminOverview = lazy(() => import("@/pages/admin/sections/AdminOverview"));
const AdminUsers = lazy(() => import("@/pages/admin/sections/AdminUsers"));
const AdminEvents = lazy(() => import("@/pages/admin/sections/AdminEvents"));
const AdminTickets = lazy(() => import("@/pages/admin/sections/AdminTickets"));
const AdminFinance = lazy(() => import("@/pages/admin/sections/AdminFinance"));
const AdminOrganizers = lazy(() => import("@/pages/admin/sections/AdminOrganizers"));
const AdminVendors = lazy(() => import("@/pages/admin/sections/AdminVendors"));
const AdminInfluencers = lazy(() => import("@/pages/admin/sections/AdminInfluencers"));
const AdminSystem = lazy(() => import("@/pages/admin/sections/AdminSystem"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

interface ProtectedRouteProps {
  children: JSX.Element;
  requiredUserType?: "user" | "organizer" | "vendor" | "influencer" | "admin";
}

const ProtectedRoute = ({ children, requiredUserType }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { toast } = useToast();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    toast({
      title: "Authentication Required",
      description: "Please sign in to access this page.",
      variant: "destructive",
    });
    return <Navigate to="/signin" replace />;
  }

  if (requiredUserType && user?.userType !== requiredUserType) {
    toast({
      title: "Access Denied",
      description: `This page is restricted to ${requiredUserType}s only.`,
      variant: "destructive",
    });
    return <Navigate to="/app" replace />;
  }

  return children;
};

const ScannerRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { toast } = useToast();
  const isOrganizer = user?.userType === "organizer";
  const hasAccessCode = window.location.hash.includes("code=");

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated && !hasAccessCode) {
    toast({
      title: "Authentication Required",
      description: "Please sign in to access the scanner.",
      variant: "destructive",
    });
    return <Navigate to="/signin" replace />;
  }

  if (!isOrganizer && !hasAccessCode) {
    toast({
      title: "Access Denied",
      description: "Only organizers or users with a valid access code can use the scanner.",
      variant: "destructive",
    });
    return <Navigate to="/app" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute>
            <Explore />
          </ProtectedRoute>
        }
      />
      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <Events />
          </ProtectedRoute>
        }
      />
      <Route
        path="/myevents"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <MyEvents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/influencers"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <Influencers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <ProtectedRoute>
            <Tickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-event"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <CreateEvent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-event/:id"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <CreateEvent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id/edit"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <CreateEvent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <EventDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:id"
        element={
          <ProtectedRoute>
            <EventDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:eventId/scanners"
        element={
          <ProtectedRoute requiredUserType="organizer">
            <ScannerManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan/:eventId"
        element={
          <ScannerRoute>
            <ScannerPage />
          </ScannerRoute>
        }
      />
      <Route
        path="/scan/key/:eventKey"
        element={
          <ScannerRoute>
            <ScannerPage />
          </ScannerRoute>
        }
      />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route
        path="/payment/verify/:reference"
        element={
          <ProtectedRoute>
            <PaymentVerify />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase/:eventKey"
        element={
          <ProtectedRoute>
            <PurchasePage />
          </ProtectedRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* ── Vendor marketplace ── */}
      <Route path="/vendors" element={<Suspense fallback={null}><VendorMarketplace /></Suspense>} />
      <Route path="/vendors/:id" element={<Suspense fallback={null}><VendorProfile /></Suspense>} />
      <Route path="/vendor/register" element={
        <ProtectedRoute><Suspense fallback={null}><VendorRegister /></Suspense></ProtectedRoute>
      } />
      <Route path="/vendor-dashboard" element={
        <ProtectedRoute requiredUserType="vendor"><Suspense fallback={null}><VendorDashboard /></Suspense></ProtectedRoute>
      } />
      <Route path="/events/:eventId/vendors" element={
        <ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><EventVendors /></Suspense></ProtectedRoute>
      } />

      {/* ── Influencer portal ── */}
      <Route path="/influencer" element={
        <ProtectedRoute requiredUserType="influencer"><Suspense fallback={null}><InfluencerDashboard /></Suspense></ProtectedRoute>
      } />
      <Route path="/influencer/payouts" element={
        <ProtectedRoute requiredUserType="influencer"><Suspense fallback={null}><InfluencerPayouts /></Suspense></ProtectedRoute>
      } />
      <Route path="/influencer/claim/:token" element={<Suspense fallback={null}><InfluencerClaim /></Suspense>} />

      {/* ── Organizer credits ── */}
      <Route path="/credits" element={
        <ProtectedRoute requiredUserType="organizer"><Suspense fallback={null}><CreditsPage /></Suspense></ProtectedRoute>
      } />

      {/* ── Admin dashboard ── */}
      <Route path="/admin" element={
        <ProtectedRoute requiredUserType="admin">
          <Suspense fallback={null}><AdminLayout /></Suspense>
        </ProtectedRoute>
      }>
        <Route index element={<Suspense fallback={null}><AdminOverview /></Suspense>} />
        <Route path="users" element={<Suspense fallback={null}><AdminUsers /></Suspense>} />
        <Route path="events" element={<Suspense fallback={null}><AdminEvents /></Suspense>} />
        <Route path="tickets" element={<Suspense fallback={null}><AdminTickets /></Suspense>} />
        <Route path="finance" element={<Suspense fallback={null}><AdminFinance /></Suspense>} />
        <Route path="organizers" element={<Suspense fallback={null}><AdminOrganizers /></Suspense>} />
        <Route path="vendors" element={<Suspense fallback={null}><AdminVendors /></Suspense>} />
        <Route path="influencers" element={<Suspense fallback={null}><AdminInfluencers /></Suspense>} />
        <Route path="system" element={<Suspense fallback={null}><AdminSystem /></Suspense>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <MobileGuard>
        <HashRouter>
          <AuthProvider>
            <EventProvider>
              <TicketProvider>
                <BookingProvider>
                  <div className="relative">
                    <AppRoutes />
                    <BottomNavigation />
                  </div>
                </BookingProvider>
              </TicketProvider>
            </EventProvider>
          </AuthProvider>
        </HashRouter>
      </MobileGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;