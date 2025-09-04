// src/pages/Index.tsx

import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold mb-4">Welcome to Bukr 👋</h1>
        <p className="text-lg text-muted-foreground mb-6">
          Bukr is your all-in-one event companion. Discover events, collaborate with organizers, scan tickets, and influence the crowd — all from one platform.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => navigate("/explore")}>Explore Events</Button>
          <Button variant="secondary" onClick={() => navigate("/signin")}>
            Sign In to Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
