// src/pages/NotFound.tsx

import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import AnimatedLogo from "@/components/AnimatedLogo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

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