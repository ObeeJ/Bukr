import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Users, Calendar, Star, Globe, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import AnimatedLogo from "@/components/AnimatedLogo";

const Landing = () => {
  const { toast } = useToast();
  const [contactForm, setContactForm] = useState({ email: "", message: "" });

  const companies = [
    { name: "LiveNation", logo: "🎤" },
    { name: "Eventbrite", logo: "🎟️" },
    { name: "Coachella", logo: "🎪" },
    { name: "TED", logo: "💡" },
    { name: "SXSW", logo: "🎸" },
    { name: "Comic-Con", logo: "🦸‍♂️" }
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message Sent!",
      description: "We'll get back to you within 24 hours.",
    });
    setContactForm({ email: "", message: "" });
  };

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
          <AnimatedLogo size="md" />
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
              <AnimatedLogo size="md" />
            </div>
            <p className="text-muted-foreground">
              Making event booking seamless and exciting worldwide.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <div className="space-y-2 text-muted-foreground">
              <div className="hover:text-foreground transition-colors cursor-pointer">API (Coming Soon)</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <div className="space-y-2 text-muted-foreground">
              <div className="hover:text-foreground transition-colors cursor-pointer">About</div>
              <Link to="/privacy-policy" className="block hover:text-foreground transition-colors">Privacy & Policy</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <a href="mailto:support@bukr.app" className="text-primary hover:text-primary-glow transition-colors">
                  support@bukr.app
                </a>
              </div>
              <form onSubmit={handleContactSubmit} className="space-y-3">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  className="glass-card border-glass-border bg-glass/20 text-sm"
                  required
                />
                <Textarea
                  placeholder="Your message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                  className="glass-card border-glass-border bg-glass/20 text-sm"
                  rows={3}
                  required
                />
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  <Send className="w-3 h-3 mr-2" />
                  Send Message
                </Button>
              </form>
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