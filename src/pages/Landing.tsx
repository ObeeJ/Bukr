import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Calendar, Star, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  const companies = [
    { name: "TechCorp", logo: "🏢" },
    { name: "EventHub", logo: "🎯" },
    { name: "MusicLive", logo: "🎵" },
    { name: "ArtSpace", logo: "🎨" },
    { name: "SportMax", logo: "⚽" },
    { name: "ConferencePro", logo: "💼" }
  ];

  const upcomingEvents = [
    { title: "Tech Summit 2025", attendees: "2.5K", image: "💻" },
    { title: "Music Festival", attendees: "15K", image: "🎵" },
    { title: "Art Exhibition", attendees: "800", image: "🎨" },
    { title: "Sports Championship", attendees: "50K", image: "🏆" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 glass-card m-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="text-xl font-bold">🎯</span>
          </div>
          <span className="text-2xl font-bold text-glow">Bukr</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
          <div className="flex gap-3">
            <Link to="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="glow">Sign Up</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-bold text-glow mb-6 animate-fade-in">
            Book Amazing
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Events
            </span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-slide-up">
            Discover, book, and experience the world's most incredible events. 
            From concerts to conferences, we make event booking seamless and exciting.
          </p>
          
          <Link to="/app">
            <Button 
              variant="glow" 
              size="lg" 
              className="px-12 py-6 text-xl group animate-scale-in hover-glow transition-all duration-500"
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

      {/* Companies Using Bukr */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-glow">
            Trusted by Leading Companies
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

      {/* Upcoming Events */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-glow">
            Popular Events on Bukr
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {upcomingEvents.map((event, index) => (
              <div 
                key={event.title}
                className="glass-card p-6 hover-glow animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-5xl mb-4 text-center">{event.image}</div>
                <h3 className="font-bold text-lg mb-2 text-foreground">{event.title}</h3>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {event.attendees}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <span>4.8</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Global Currency Support */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-glow">
            Global Payment Support
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Pay in your local currency with automatic location-based detection
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 glass-card px-4 py-2">
              <Globe className="w-5 h-5 text-primary" />
              <span>USD • EUR • GBP</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2">
              <Globe className="w-5 h-5 text-primary" />
              <span>NGN • GHS • KES</span>
            </div>
            <div className="flex items-center gap-2 glass-card px-4 py-2">
              <Globe className="w-5 h-5 text-primary" />
              <span>RWF • ZAR • CNY</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-glass-border/30">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold">🎯</span>
              </div>
              <span className="text-xl font-bold">Bukr</span>
            </div>
            <p className="text-muted-foreground">
              Making event booking seamless and exciting worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <div className="space-y-2 text-muted-foreground">
              <div>Features</div>
              <div>Pricing</div>
              <div>API</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <div className="space-y-2 text-muted-foreground">
              <Link to="/about" className="block hover:text-foreground transition-colors">About</Link>
              <Link to="/contact" className="block hover:text-foreground transition-colors">Contact</Link>
              <div>Careers</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <div className="space-y-2 text-muted-foreground">
              <div>Help Center</div>
              <div>Privacy Policy</div>
              <div>Terms of Service</div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto border-t border-glass-border/30 pt-8 mt-8 text-center text-muted-foreground">
          <p>&copy; 2025 Bukr. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;