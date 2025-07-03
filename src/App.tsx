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
import NotFound from "./pages/NotFound";
import CreateEvent from "./pages/CreateEvent";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import BottomNavigation from "./components/BottomNavigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Routes>
            <Route path="/app" element={<BottomNavigation />} />
            <Route path="/favorites" element={<BottomNavigation />} />
            <Route path="/events" element={<BottomNavigation />} />
            <Route path="/profile" element={<BottomNavigation />} />
            <Route path="/create-event" element={<BottomNavigation />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
