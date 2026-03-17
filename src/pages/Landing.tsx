// ============================================================================
// LANDING PAGE — Antigravity-inspired. Particles. Typed text. Icon strip.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Search, Zap, ShieldCheck, Smartphone, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedLogo from "@/components/AnimatedLogo";

// ─── Typed headline ────────────────────────────────────────────────────────────
const HEADLINE = "Make every moment count.";

const TypedHeadline = () => {
  const [displayed, setDisplayed] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (displayed >= HEADLINE.length) { setDone(true); return; }
    const t = setTimeout(() => setDisplayed((d) => d + 1), 48);
    return () => clearTimeout(t);
  }, [displayed]);

  return (
    <h1 className="landing-headline">
      {HEADLINE.split("").map((ch, i) => (
        <span
          key={i}
          className="landing-headline__char"
          style={{
            opacity: i < displayed ? 1 : 0,
            transform: i < displayed ? "translateY(0)" : "translateY(18px)",
            transition: `opacity 0.25s ease ${i * 0.01}s, transform 0.3s ease ${i * 0.01}s`,
            display: ch === " " ? "inline" : "inline-block",
          }}
        >
          {ch}
        </span>
      ))}
      {/* Blinking cursor */}
      {!done && <span className="landing-cursor" />}
    </h1>
  );
};

// ─── Particle canvas — particles follow cursor ────────────────────────────────
const HeroParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store mouse position in a ref — no re-renders, just raw coords
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; pulse: number };
    const pts: P[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Track cursor relative to the canvas position
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    for (let i = 0; i < 80; i++) {
      pts.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.4,
        a: Math.random() * 0.6 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    const ATTRACT_RADIUS = 220;
    const ATTRACT_FORCE  = 0.32;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouse.current.x;
      const my = mouse.current.y;

      pts.forEach((p) => {
        // ── Cursor attraction ──
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ATTRACT_RADIUS && dist > 0) {
          // Closer = stronger pull; falls off linearly with distance
          const force = (1 - dist / ATTRACT_RADIUS) * ATTRACT_FORCE;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // ── Speed cap so particles don't fly off ──
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const MAX_SPEED = 6;
        if (speed > MAX_SPEED) {
          p.vx = (p.vx / speed) * MAX_SPEED;
          p.vy = (p.vy / speed) * MAX_SPEED;
        }

        // ── Gentle friction so they drift back to idle ──
        p.vx *= 0.992;
        p.vy *= 0.992;

        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Particles near cursor glow brighter
        const proximity = dist < ATTRACT_RADIUS ? (1 - dist / ATTRACT_RADIUS) * 0.5 : 0;
        const alpha = Math.min(1, p.a * (0.7 + 0.3 * Math.sin(p.pulse)) + proximity);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + proximity * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(193,100%,75%,${alpha})`;
        ctx.fill();
      });

      // ── Connection lines ──
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `hsla(193,100%,75%,${(1 - d / 120) * 0.12})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  // pointer-events: none keeps the canvas transparent to clicks
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ─── Marquee strip — event category pills (no emojis) ─────────────────────────
const CATEGORIES = [
  "Concerts", "Tech Conferences", "Comedy Shows", "Art Exhibitions",
  "Sports Events", "Festivals", "Networking", "Workshops",
  "Film Screenings", "Food & Drink", "Fashion Shows",
  // duplicate for seamless loop
  "Concerts", "Tech Conferences", "Comedy Shows", "Art Exhibitions",
  "Sports Events", "Festivals", "Networking", "Workshops",
  "Film Screenings", "Food & Drink", "Fashion Shows",
];

const IconStrip = () => (
  <div className="landing-icon-strip">
    <div className="landing-icon-strip__track">
      {CATEGORIES.map((cat, i) => (
        <div key={i} className="landing-icon-strip__item">
          {cat}
        </div>
      ))}
    </div>
  </div>
);

// ─── 3D floating card ──────────────────────────────────────────────────────────
const FloatingCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <div
    className="landing-float-card"
    style={{ animationDelay: `${delay}s` }}
  >
    {children}
  </div>
);

// ─── Main Landing ──────────────────────────────────────────────────────────────
const Landing = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* ── Background layers ── */}
      <HeroParticles />
      <div className="landing-bg-grid" />
      <div className="landing-bg-orb landing-bg-orb--1" />
      <div className="landing-bg-orb landing-bg-orb--2" />
      <div className="landing-bg-orb landing-bg-orb--3" />

      {/* ── Nav bar ── */}
      <nav className="landing-nav">
        <AnimatedLogo size="sm" />
        <div className="landing-nav__actions">
          {isAuthenticated ? (
            <Button
              variant="glow"
              size="sm"
              onClick={() => navigate(user?.userType === "organizer" ? "/dashboard" : "/app")}
              className="cta"
            >
              Open App
            </Button>
          ) : (
            // Nav just shows the product tagline — CTAs live in the hero, no duplication
            <span className="landing-nav__tagline">Book smarter. Pay less.</span>
          )}
        </div>
      </nav>

      {/* ── Hero section ── */}
      <section className="landing-hero">
        <div className="landing-hero__inner">
          {/* Badge */}
          <div className="landing-badge animate-fade-in">
            <span className="landing-badge__dot" />
            The fastest ticket platform on the planet
          </div>

          {/* Logo */}
          <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <AnimatedLogo size="lg" />
          </div>

          {/* Typed headline */}
          <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <TypedHeadline />
          </div>

          {/* Sub */}
          <p className="landing-sub animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Create events fast. Book tickets in 3 seconds.
          </p>

          {/* CTA */}
          <div className="landing-cta animate-fade-in" style={{ animationDelay: "0.55s" }}>
            {isAuthenticated ? (
              <Button
                onClick={() => navigate(user?.userType === "organizer" ? "/dashboard" : "/app")}
                variant="glow"
                size="lg"
                className="landing-cta__primary cta"
              >
                {user?.userType === "organizer" ? (
                  <><Calendar className="w-5 h-5" /> Manage Events</>
                ) : (
                  <><Search className="w-5 h-5" /> Find Events</>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => navigate("/auth?tab=signup")}
                  variant="glow"
                  size="lg"
                  className="landing-cta__primary cta"
                >
                  Start for free <ArrowRight className="w-5 h-5" />
                </Button>
                <Button
                  onClick={() => navigate("/auth?tab=signin")}
                  variant="outline"
                  size="lg"
                  className="landing-cta__secondary"
                >
                  Sign In
                </Button>
              </>
            )}
          </div>

          {/* Stats — honest startup numbers */}
          <div className="landing-stats animate-fade-in" style={{ animationDelay: "0.7s" }}>
            {[
              { value: "< 3s", label: "Avg. Booking Time" },
              { value: "0%", label: "Hidden Fees" },
              { value: "24/7", label: "Support" },
            ].map(({ value, label }, i) => (
              <FloatingCard key={label} delay={i * 0.15}>
                <div className="landing-stat__value">{value}</div>
                <div className="landing-stat__label">{label}</div>
              </FloatingCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Icon strip ── */}
      <IconStrip />

      {/* ── Feature strip ── */}
      <section className="landing-features animate-fade-in" style={{ animationDelay: "0.9s" }}>
        {[
          { icon: Zap,          title: "Instant Booking",  desc: "Reserve your spot in seconds, not minutes." },
          { icon: ShieldCheck,  title: "Secure Payments",  desc: "Paystack & Stripe. Your money is safe." },
          { icon: Smartphone,   title: "Mobile First",     desc: "Built for the phone in your pocket." },
          { icon: Compass,      title: "Smart Discovery",  desc: "Events curated to your taste." },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="landing-feature-card">
            <div className="landing-feature-card__icon"><Icon className="w-5 h-5" /></div>
            <h3 className="landing-feature-card__title">{title}</h3>
            <p className="landing-feature-card__desc">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Landing;
