// ============================================================================
// AUTH PAGE — Dedicated full-page authentication
// Replaces the modal pattern. Own background, own world.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Eye, EyeOff, User, Building, AlertCircle, CheckCircle,
  ArrowLeft, Mail, Lock, UserCircle, ArrowRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import AnimatedLogo from "@/components/AnimatedLogo";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "signin" | "signup";
type View = "auth" | "forgot";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getErrorMessage = (error: unknown, type: "signin" | "signup" | "forgot"): string => {
  const msg = (error as { message?: string })?.message?.toLowerCase() ?? "";
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "Wrong email or password. Give it another shot.";
  if (msg.includes("email not confirmed") || msg.includes("not confirmed"))
    return "Confirm your email first — check your inbox.";
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already"))
    return "This email's already in the club. Try signing in instead.";
  if (msg.includes("invalid email") || msg.includes("valid email"))
    return "That email doesn't look right.";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
    return "Can't reach the server. Check your connection.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Take a breath and try again in a minute.";
  if (type === "forgot") return "Couldn't send the reset email. Double-check the address.";
  return type === "signin"
    ? "Something went sideways. Try again."
    : "Signup hit a snag. Try again in a moment.";
};

const getPasswordStrength = (pw: string): number => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Feedback = ({ type, msg }: { type: "error" | "success"; msg: string }) => (
  <div className={`auth-feedback ${type === "error" ? "auth-feedback--error" : "auth-feedback--success"}`}>
    {type === "error"
      ? <AlertCircle className="w-4 h-4 shrink-0" />
      : <CheckCircle className="w-4 h-4 shrink-0" />}
    <span className="text-sm">{msg}</span>
  </div>
);

const StrengthBar = ({ password }: { password: string }) => {
  const s = getPasswordStrength(password);
  if (!password) return null;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-400"];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= s ? colors[s] : "bg-white/10"}`} />
        ))}
      </div>
      <p className={`text-xs ${s <= 1 ? "text-red-400" : s === 2 ? "text-orange-400" : s === 3 ? "text-yellow-400" : "text-green-400"}`}>
        {labels[s]}
      </p>
    </div>
  );
};

const IconInput = ({ icon: Icon, ...props }: { icon: React.ElementType } & React.ComponentProps<"input">) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
    <input
      {...props}
      className={`auth-input ${props.className ?? ""}`}
    />
  </div>
);

// ─── Particle canvas — full-page, cursor-attracted, same as landing ───────────
const ParticleField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; pulse: number };
    const pts: P[] = [];

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);

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
        const dx = mx - p.x;
        const dy = my - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < ATTRACT_RADIUS && dist > 0) {
          const force = (1 - dist / ATTRACT_RADIUS) * ATTRACT_FORCE;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 6) { p.vx = (p.vx / speed) * 6; p.vy = (p.vy / speed) * 6; }

        p.vx *= 0.992;
        p.vy *= 0.992;
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += 0.02;

        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        const proximity = dist < ATTRACT_RADIUS ? (1 - dist / ATTRACT_RADIUS) * 0.5 : 0;
        const alpha = Math.min(1, p.a * (0.7 + 0.3 * Math.sin(p.pulse)) + proximity);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + proximity * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(193,100%,75%,${alpha})`;
        ctx.fill();
      });

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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ─── Main Auth Page ────────────────────────────────────────────────────────────
const Auth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = (searchParams.get("tab") as Tab) ?? "signin";

  const [tab, setTab] = useState<Tab>(defaultTab);
  const [view, setView] = useState<View>("auth");
  const [showPw, setShowPw] = useState(false);
  const [userType, setUserType] = useState<"user" | "organizer">("user");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });

  const { signIn, signUp, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/app", { replace: true });
  }, [isAuthenticated, navigate]);

  const clearFeedback = useCallback(() => setFeedback(null), []);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    clearFeedback();
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const handleSignIn = async () => {
    clearFeedback();
    setIsLoading(true);
    try {
      await signIn(form.email, form.password);
      setFeedback({ type: "success", msg: "You're in. Welcome back!" });
    } catch (err) {
      setFeedback({ type: "error", msg: getErrorMessage(err, "signin") });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    clearFeedback();
    if (!form.name.trim()) {
      setFeedback({ type: "error", msg: "We need your name." });
      return;
    }
    if (form.password.length < 8 || getPasswordStrength(form.password) < 2) {
      setFeedback({ type: "error", msg: "Password must be 8+ characters with uppercase letters and numbers." });
      return;
    }
    setIsLoading(true);
    try {
      await signUp({
        name: form.name,
        email: form.email,
        password: form.password,
        userType,
        orgName: userType === "organizer" ? form.orgName : undefined,
      });
      setFeedback({ type: "success", msg: "Account created! Check your email to confirm." });
    } catch (err) {
      setFeedback({ type: "error", msg: getErrorMessage(err, "signup") });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!resetEmail.trim()) {
      setFeedback({ type: "error", msg: "Enter your email first." });
      return;
    }
    clearFeedback();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`,
      });
      if (error) throw error;
      setFeedback({ type: "success", msg: "Reset link sent! Check your inbox." });
    } catch (err) {
      setFeedback({ type: "error", msg: getErrorMessage(err, "forgot") });
    } finally {
      setIsLoading(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    clearFeedback();
  };

  return (
    <div className="auth-page">
      {/* ── Full-page particle canvas — sits behind both panels ── */}
      <ParticleField />
      {/* Landing-identical background layers */}
      <div className="auth-bg-grid" />
      <div className="auth-bg-orb auth-bg-orb--1" />
      <div className="auth-bg-orb auth-bg-orb--2" />
      <div className="auth-bg-orb auth-bg-orb--3" />

      {/* ── Left panel: branding ── */}
      <div className="auth-left">
        {/* Radial glow orbs */}
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
        <div className="auth-orb auth-orb--3" />

        {/* Grid overlay */}
        <div className="auth-grid-overlay" />

        <div className="auth-left__content">
          <Link to="/" className="auth-back-link">
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Link>

          <div className="auth-brand">
            <AnimatedLogo size="lg" />
            <p className="auth-brand__tagline">Make every moment count.</p>
          </div>

          <div className="auth-stats">
            {[
              { value: "< 3s", label: "Avg. Booking Time" },
              { value: "2%", label: "That's All We Take" },
              { value: "24/7", label: "Support" },
            ].map(({ value, label }) => (
              <div key={label} className="auth-stat">
                <span className="auth-stat__value">{value}</span>
                <span className="auth-stat__label">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="auth-right">
        <div className="auth-card">

          {/* ── Forgot password view ── */}
          {view === "forgot" && (
            <div className="auth-form-section animate-fade-in">
              <div className="auth-card__header">
                <h2 className="auth-card__title">Reset password</h2>
                <p className="auth-card__sub">We'll send a magic link to your inbox.</p>
              </div>

              {feedback && <Feedback type={feedback.type} msg={feedback.msg} />}

              <div className="auth-field">
                <Label htmlFor="reset-email">Email address</Label>
                <IconInput
                  icon={Mail}
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleForgot()}
                />
              </div>

              <Button onClick={handleForgot} variant="glow" className="w-full h-11 cta" disabled={isLoading}>
                {isLoading ? "Sending…" : "Send reset link"}
              </Button>

              <button
                onClick={() => { setView("auth"); clearFeedback(); }}
                className="auth-text-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </button>
            </div>
          )}

          {/* ── Auth tabs view ── */}
          {view === "auth" && (
            <>
              <div className="auth-card__header">
                <h2 className="auth-card__title">
                  {tab === "signin" ? "Welcome back" : "Create account"}
                </h2>
                <p className="auth-card__sub">
                  {tab === "signin"
                    ? "Sign in to continue booking moments."
                    : "Join Bukr and start experiencing events."}
                </p>
              </div>

              {/* Tab switcher */}
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${tab === "signin" ? "auth-tab--active" : ""}`}
                  onClick={() => switchTab("signin")}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${tab === "signup" ? "auth-tab--active" : ""}`}
                  onClick={() => switchTab("signup")}
                >
                  Sign Up
                </button>
                {/* Sliding indicator */}
                <div className={`auth-tab-indicator ${tab === "signup" ? "translate-x-full" : ""}`} />
              </div>

              {feedback && <Feedback type={feedback.type} msg={feedback.msg} />}

              {/* ── Sign In form ── */}
              {tab === "signin" && (
                <div className="auth-form-section animate-fade-in">
                  <div className="auth-field">
                    <Label htmlFor="si-email">Email</Label>
                    <IconInput icon={Mail} id="si-email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                  </div>

                  <div className="auth-field">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="si-pw">Password</Label>
                      <button
                        type="button"
                        onClick={() => { setResetEmail(form.email); clearFeedback(); setView("forgot"); }}
                        className="text-xs text-primary/80 hover:text-primary transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <IconInput
                        icon={Lock}
                        id="si-pw"
                        type={showPw ? "text" : "password"}
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={set("password")}
                        onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                        onClick={() => setShowPw(!showPw)}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button onClick={handleSignIn} variant="glow" className="w-full h-11 cta mt-1" disabled={isLoading}>
                    {isLoading ? "Signing in…" : (
                      <span className="flex items-center gap-2">Sign In <ArrowRight className="w-4 h-4" /></span>
                    )}
                  </Button>

                  <p className="text-center text-sm text-white/40 mt-2">
                    No account?{" "}
                    <button onClick={() => switchTab("signup")} className="text-primary hover:text-primary/80 transition-colors font-medium">
                      Sign up free
                    </button>
                  </p>
                </div>
              )}

              {/* ── Sign Up form ── */}
              {tab === "signup" && (
                <div className="auth-form-section animate-fade-in">
                  {/* Role toggle */}
                  <div className="auth-role-toggle">
                    <div className={`auth-role-highlight ${userType === "organizer" ? "translate-x-full" : ""}`} />
                    <button
                      type="button"
                      onClick={() => setUserType("user")}
                      className={`auth-role-btn ${userType === "user" ? "text-primary" : "text-white/40"}`}
                    >
                      <User className="w-4 h-4" /> Attendee
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType("organizer")}
                      className={`auth-role-btn ${userType === "organizer" ? "text-primary" : "text-white/40"}`}
                    >
                      <Building className="w-4 h-4" /> Organizer
                    </button>
                  </div>

                  <div className="auth-field">
                    <Label htmlFor="su-name">Full Name</Label>
                    <IconInput icon={UserCircle} id="su-name" placeholder="What should we call you?" value={form.name} onChange={set("name")} />
                  </div>

                  {userType === "organizer" && (
                    <div className="auth-field animate-fade-in">
                      <Label htmlFor="su-org">Organization Name</Label>
                      <IconInput icon={Building} id="su-org" placeholder="Your brand, your stage" value={form.orgName} onChange={set("orgName")} />
                    </div>
                  )}

                  <div className="auth-field">
                    <Label htmlFor="su-email">Email</Label>
                    <IconInput icon={Mail} id="su-email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} />
                  </div>

                  <div className="auth-field">
                    <Label htmlFor="su-pw">Password</Label>
                    <div className="relative">
                      <IconInput
                        icon={Lock}
                        id="su-pw"
                        type={showPw ? "text" : "password"}
                        placeholder="Make it something you'll remember"
                        value={form.password}
                        onChange={set("password")}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                        onClick={() => setShowPw(!showPw)}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <StrengthBar password={form.password} />
                  </div>

                  <Button
                    onClick={handleSignUp}
                    variant="glow"
                    className="w-full h-11 cta mt-1"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account…" : `Join as ${userType === "organizer" ? "Organizer" : "Attendee"}`}
                  </Button>

                  <p className="text-center text-sm text-white/40 mt-2">
                    Already have an account?{" "}
                    <button onClick={() => switchTab("signin")} className="text-primary hover:text-primary/80 transition-colors font-medium">
                      Sign in
                    </button>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
