// src/pages/Landing.tsx (Hero Section Only)

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedLogo from "@/components/AnimatedLogo";
import AuthModal from "@/components/AuthModal";

const Landing = () => {
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: "signin" as "signin" | "signup" });
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex items-center justify-center px-3 sm:px-4 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 animate-pulse"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"></div>

      <div className="relative max-w-4xl mx-auto text-center px-2">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <AnimatedLogo size="lg" className="mb-4 sm:mb-6 mx-auto" />
        </div>

        <div className="mb-4 sm:mb-6 animate-slide-up">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse watermark leading-tight">
            Make Every Moment Count!
          </h2>
        </div>

        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto animate-slide-up font-montserrat px-2">
          Discover, book, and experience the world's most incredible events. 
          From concerts to conferences, we make event booking seamless and exciting.
        </p>

        {isAuthenticated ? (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            {user?.userType === 'organizer' ? (
              <Button 
                onClick={() => navigate('/dashboard')}
                variant="glow" 
                size="lg" 
                className="px-6 sm:px-8 py-4 sm:py-6 text-lg sm:text-xl group animate-scale-in button-glow transition-all duration-500 hover:scale-105 transform-gpu shadow-lg hover:shadow-xl touch-target"
                style={{
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                <Calendar className="mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" />
                <span className="font-medium logo">Manage Events</span>
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/app')}
                variant="glow" 
                size="lg" 
                className="px-6 sm:px-8 py-4 sm:py-6 text-lg sm:text-xl group animate-scale-in button-glow transition-all duration-500 hover:scale-105 transform-gpu shadow-lg hover:shadow-xl touch-target"
                style={{
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}
              >
                <Search className="mr-2 sm:mr-3 w-5 h-5 sm:w-6 sm:h-6" />
                <span className="font-medium logo">Find Events</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="px-4">
            <Button 
              onClick={() => setAuthModal({ isOpen: true, tab: "signin" })}
              variant="glow" 
              size="lg" 
              className="px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl group animate-scale-in button-glow transition-all duration-500 hover:scale-105 transform-gpu shadow-lg hover:shadow-xl touch-target cta"
              style={{
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              <span className="font-medium">Use Bukr</span>
              <ArrowRight className="ml-2 sm:ml-3 w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mt-8 sm:mt-12 md:mt-16 max-w-2xl mx-auto px-4">
          <div className="glass-card p-4 sm:p-6 text-center hover-glow rounded-xl shadow-md transition-shadow duration-300">
            <div className="text-2xl sm:text-3xl font-semibold text-primary mb-1 sm:mb-2 watermark">1M+</div>
            <div className="text-sm sm:text-base text-muted-foreground font-montserrat">Events Booked</div>
          </div>
          <div className="glass-card p-4 sm:p-6 text-center hover-glow rounded-xl shadow-md transition-shadow duration-300">
            <div className="text-2xl sm:text-3xl font-semibold text-primary mb-1 sm:mb-2 watermark">500K+</div>
            <div className="text-sm sm:text-base text-muted-foreground font-montserrat">Happy Users</div>
          </div>
          <div className="glass-card p-4 sm:p-6 text-center hover-glow rounded-xl shadow-md transition-shadow duration-300">
            <div className="text-2xl sm:text-3xl font-semibold text-primary mb-1 sm:mb-2 watermark">50+</div>
            <div className="text-sm sm:text-base text-muted-foreground font-montserrat">Countries</div>
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        defaultTab={authModal.tab}
      />
    </section>
  );
};

export default Landing;