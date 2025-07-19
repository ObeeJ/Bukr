import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Explore from "./pages/Explore";
import Favorites from "./pages/Favorites";
import MyEvents from "./pages/MyEvents";
import Profile from "./pages/Profile";
import CreateEvent from "./pages/CreateEvent";
import EventDashboard from "./pages/EventDashboard";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";
import BottomNavigation from "./components/BottomNavigation";
import MobileGuard from "./components/MobileGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <MobileGuard>
        <BrowserRouter>
        <div className="relative">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/app" element={<Explore />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/events" element={<MyEvents />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/dashboard" element={<EventDashboard />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNavigation />
        </div>
        </BrowserRouter>
      </MobileGuard>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
