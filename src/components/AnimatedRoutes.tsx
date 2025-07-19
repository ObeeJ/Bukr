import { Routes, Route, useLocation } from "react-router-dom";
import PageTransition from "./PageTransition";

// Pages
import Landing from "../pages/Landing";
import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import Explore from "../pages/Explore";
import Favorites from "../pages/Favorites";
import MyEvents from "../pages/MyEvents";
import Profile from "../pages/Profile";
import CreateEvent from "../pages/CreateEvent";
import EventDashboard from "../pages/EventDashboard";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import NotFound from "../pages/NotFound";

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <Landing />
          </PageTransition>
        } />
        <Route path="/signin" element={
          <PageTransition>
            <SignIn />
          </PageTransition>
        } />
        <Route path="/signup" element={
          <PageTransition>
            <SignUp />
          </PageTransition>
        } />
        <Route path="/app" element={
          <PageTransition>
            <Explore />
          </PageTransition>
        } />
        <Route path="/favorites" element={
          <PageTransition>
            <Favorites />
          </PageTransition>
        } />
        <Route path="/events" element={
          <PageTransition>
            <MyEvents />
          </PageTransition>
        } />
        <Route path="/profile" element={
          <PageTransition>
            <Profile />
          </PageTransition>
        } />
        <Route path="/create-event" element={
          <PageTransition>
            <CreateEvent />
          </PageTransition>
        } />
        <Route path="/dashboard" element={
          <PageTransition>
            <EventDashboard />
          </PageTransition>
        } />
        <Route path="/privacy-policy" element={
          <PageTransition>
            <PrivacyPolicy />
          </PageTransition>
        } />
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
      </Routes>
  );
};

export default AnimatedRoutes;