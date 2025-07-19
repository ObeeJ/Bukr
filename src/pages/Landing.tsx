import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedLogo from "@/components/AnimatedLogo";
import AuthModal from "@/components/AuthModal";
import PopularEvents from "@/components/PopularEvents";
import BrandMarquee from "@/components/BrandMarquee";

const Landing = () => {
  const [authModal, setAuthModal] = useState({ isOpen: false, tab: "signin" as "signin" | "signup" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 glass-card m-4 rounded-2xl">
        <AnimatedLogo size="md" clickable={true} />
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={() => setAuthModal({ isOpen: true, tab: "signin" })}
          >
            Sign In
          </Button>
          <Button 
            variant="glow"
            onClick={() => setAuthModal({ isOpen: true, tab: "signup" })}
          >
            Sign Up
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <AnimatedLogo size="lg" className="mb-6" />
          </div>
          
          <div className="mb-6 animate-slide-up">
            <h2 className="text-3xl md:text-5xl font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse watermark">
              Make Every Moment Count!
            </h2>
          </div>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up font-montserrat">
            Discover, book, and experience the world's most incredible events. 
            From concerts to conferences, we make event booking seamless and exciting.
          </p>
          
          <Button 
            onClick={() => setAuthModal({ isOpen: true, tab: "signin" })}
            variant="glow" 
            size="lg" 
            className="px-12 py-6 text-xl group animate-scale-in button-glow transition-all duration-500 hover:scale-110 transform-gpu"
            style={{
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
          >
            <span className="font-medium logo">Use Bukr</span>
            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="glass-card p-6 text-center hover-glow">
              <div className="text-3xl font-semibold text-primary mb-2 watermark">1M+</div>
              <div className="text-muted-foreground font-montserrat">Events Booked</div>
            </div>
            <div className="glass-card p-6 text-center hover-glow">
              <div className="text-3xl font-semibold text-primary mb-2 watermark">500K+</div>
              <div className="text-muted-foreground font-montserrat">Happy Users</div>
            </div>
            <div className="glass-card p-6 text-center hover-glow">
              <div className="text-3xl font-semibold text-primary mb-2 watermark">50+</div>
              <div className="text-muted-foreground font-montserrat">Countries</div>
            </div>
          </div>
        </div>
      </section>

      <PopularEvents />
      <BrandMarquee />

      <AuthModal 
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        defaultTab={authModal.tab}
      />
    </div>
  );
};

export default Landing;