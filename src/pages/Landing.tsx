import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import AnimatedLogo from "@/components/AnimatedLogo";

const Landing = () => {
  const companies = [
    { name: "LiveNation", logo: "🎤" },
    { name: "Eventbrite", logo: "🎟️" },
    { name: "Coachella", logo: "🎪" },
    { name: "TED", logo: "💡" },
    { name: "SXSW", logo: "🎸" },
    { name: "Comic-Con", logo: "🦸‍♂️" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 glass-card m-4 rounded-2xl">
        <AnimatedLogo size="md" clickable={true} />
        <div className="flex gap-3">
          <Link to="/signin">
            <Button variant="ghost">Sign In</Button>
          </Link>
          <Link to="/signup">
            <Button variant="glow">Sign Up</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <AnimatedLogo size="lg" className="mb-6" />
          </div>
          
          <div className="mb-6 animate-slide-up">
            <h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent animate-pulse">
              Make Every Moment Count!
            </h2>
          </div>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up">
            Discover, book, and experience the world's most incredible events. 
            From concerts to conferences, we make event booking seamless and exciting.
          </p>
          
          <Link to="/app">
            <Button 
              variant="glow" 
              size="lg" 
              className="px-12 py-6 text-xl group animate-scale-in hover-glow transition-all duration-500 hover:scale-110 hover:shadow-[0_0_40px_hsl(var(--primary)/0.6)] transform-gpu"
              style={{
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              Use Bukr
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </Button>
          </Link>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="glass-card p-6 text-center hover-glow">
              <div className="text-3xl font-bold text-primary mb-2">1M+</div>
              <div className="text-muted-foreground">Events Booked</div>
            </div>
            <div className="glass-card p-6 text-center hover-glow">
              <div className="text-3xl font-bold text-primary mb-2">500K+</div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
            <div className="glass-card p-6 text-center hover-glow">
              <div className="text-3xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Countries</div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Partners */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-glow">
            Trusted by Leading Brands
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {companies.map((company, index) => (
              <div 
                key={company.name}
                className="glass-card p-6 text-center hover-glow animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl mb-3">{company.logo}</div>
                <div className="font-semibold text-foreground">{company.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;