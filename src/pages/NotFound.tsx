// ============================================================================
// NOT FOUND PAGE - 404 ERROR HANDLER
// ============================================================================
// Layer 1: PRESENTATION - Error page for invalid routes
//
// ARCHITECTURE ROLE:
// - Catches all unmatched routes (React Router fallback)
// - Logs 404 errors for debugging/analytics
// - Provides user-friendly error message and navigation
//
// REACT PATTERNS:
// 1. useLocation Hook: Gets current URL path
// 2. useEffect Hook: Side effect (logging) on mount
// 3. useNavigate Hook: Programmatic navigation back to home
//
// WHY LOG 404s:
// - Helps identify broken links
// - Tracks user confusion (are they looking for something that should exist?)
// - Analytics: which non-existent pages are users trying to access
//
// UX BEST PRACTICES:
// - Clear error message (not technical jargon)
// - Branded (shows logo, maintains design system)
// - Actionable (provides way to get back to working page)
// - Friendly tone ("Oops!" not "ERROR 404 NOT FOUND")
// ============================================================================

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import AnimatedLogo from "@/components/AnimatedLogo";

const NotFound = () => {
  const location = useLocation(); // Get current URL
  const navigate = useNavigate(); // Get navigation function

  // SIDE EFFECT - Log 404 error on mount
  // This helps developers identify broken links and user confusion
  // In production, you'd send this to an analytics service
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    // TODO: Send to analytics service (Google Analytics, Mixpanel, etc.)
  }, [location.pathname]); // Re-run if pathname changes

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <AnimatedLogo size="lg" className="mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-bold watermark">404</h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-montserrat">
          Oops! The page you're looking for doesn't exist.
        </p>
        <Button
          variant="glow"
          size="lg"
          className="logo font-medium hover-glow"
          onClick={() => navigate("/")}
        >
          Return to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;