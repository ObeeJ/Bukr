import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, User, Building, AlertCircle, CheckCircle, ArrowLeft, Mail, Lock, UserCircle } from "lucide-react";
import AnimatedLogo from "./AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
}

type ModalView = "auth" | "forgot" | "otp";

const getErrorMessage = (error: any, type: "signin" | "signup" | "forgot" | "otp"): string => {
  const msg = error?.message?.toLowerCase() || "";
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials"))
    return "Wrong email or password. Even the best of us mistype — give it another shot.";
  if (msg.includes("email not confirmed") || msg.includes("not confirmed"))
    return "Your email is playing hard to get. Check your inbox and confirm it first.";
  if (msg.includes("already registered") || msg.includes("already exists") || msg.includes("user already"))
    return "This email's already in the club. Try signing in instead.";
  if (msg.includes("invalid email") || msg.includes("valid email"))
    return "That email doesn't look right. Double-check the format.";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch"))
    return "Can't reach the server right now. Check your connection and try again.";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Slow down! Too many attempts. Take a breath and try again in a minute.";
  if (msg.includes("otp") || msg.includes("token") || msg.includes("invalid") || msg.includes("expired"))
    return "That code didn't work. It may have expired — request a new one.";
  if (type === "forgot") return "Couldn't send the reset email. Double-check the address and try again.";
  if (type === "otp") return "Code verification failed. Try requesting a fresh one.";
  return type === "signin"
    ? "Something went sideways. Try again — we believe in you."
    : "Signup hit a snag. Try again in a moment.";
};

const FeedbackBanner = ({ type, message }: { type: "error" | "success"; message: string }) => (
  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm animate-fade-in ${
    type === "error"
      ? "bg-destructive/10 border border-destructive/25 text-destructive-foreground"
      : "bg-success/10 border border-success/25 text-success-foreground"
  }`}>
    {type === "error"
      ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
      : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />
    }
    <span>{message}</span>
  </div>
);

// Password strength: returns 0–4
const getPasswordStrength = (pw: string): number => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
};

const PasswordStrength = ({ password }: { password: string }) => {
  const strength = getPasswordStrength(password);
  if (!password) return null;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["", "bg-destructive", "bg-warning", "bg-yellow-400", "bg-green-400"];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? colors[strength] : "bg-muted/40"}`}
          />
        ))}
      </div>
      <p className={`text-xs ${strength <= 1 ? "text-destructive" : strength === 2 ? "text-warning" : strength === 3 ? "text-yellow-400" : "text-green-400"}`}>
        {labels[strength]}
      </p>
    </div>
  );
};

// Individual OTP digit boxes
const OtpInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const next = digits.map((d, idx) => (idx === i ? "" : d));
      onChange(next.join("").trimEnd());
      if (i > 0) refs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i: number, v: string) => {
    const char = v.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, idx) => (idx === i ? char : d));
    onChange(next.join(""));
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-11 h-12 text-center text-lg font-semibold rounded-xl border glass-card border-glass-border bg-glass/20 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 transition-all duration-200 caret-primary"
        />
      ))}
    </div>
  );
};

// Input with left icon
const IconInput = ({ icon: Icon, ...props }: { icon: React.ElementType } & React.ComponentProps<typeof Input>) => (
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
    <Input {...props} className={`pl-9 glass-card border-glass-border bg-glass/20 focus:border-primary/60 transition-all duration-200 ${props.className ?? ""}`} />
  </div>
);

const AuthModal = ({ isOpen, onClose, defaultTab = "signin" }: AuthModalProps) => {
  const [view, setView] = useState<ModalView>("auth");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [userType, setUserType] = useState<"user" | "organizer">("user");
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({ email: "", password: "", name: "", orgName: "" });
  const { signIn, signUp } = useAuth();

  const clearFeedback = () => setFeedback(null);

  const goBack = () => {
    setView("auth");
    clearFeedback();
    setOtpCode("");
    setNewPassword("");
  };

  const handleSubmit = async (type: "signin" | "signup") => {
    clearFeedback();
    setIsLoading(true);
    try {
      if (type === "signin") {
        await signIn(formData.email, formData.password);
        setFeedback({ type: "success", message: "You're in. Welcome back!" });
        setTimeout(onClose, 800);
      } else {
        if (!formData.name.trim()) {
          setFeedback({ type: "error", message: "We need your name — we're not that mysterious." });
          return;
        }
        if (formData.password.length < 6) {
          setFeedback({ type: "error", message: "Password needs at least 6 characters. Make it count." });
          return;
        }
        await signUp({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          userType,
          orgName: userType === "organizer" ? formData.orgName : undefined,
        });
        setFeedback({ type: "success", message: "Account created! Check your email to confirm and you're good to go." });
      }
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error, type) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      setFeedback({ type: "error", message: "Drop your email in there first." });
      return;
    }
    clearFeedback();
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim().toLowerCase() }),
      });
      const body = await res.json();
      if (!res.ok && body?.error?.message) throw new Error(body.error.message);
      setFeedback({
        type: "success",
        message: "If that email is registered, a 6-digit code is on its way. Check your inbox.",
      });
    } catch (error: any) {
      setFeedback({ type: "error", message: error?.message || "Couldn't send the reset code. Double-check the address." });
    } finally {
      setIsLoading(false);
    }
  };

  // Not used in link flow — kept as no-op to avoid removing OTP view wiring
  const handleOtpVerify = async () => {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-2">
            <AnimatedLogo size="md" className="mb-2" />
            <DialogTitle className="text-foreground text-xl">
              {view === "forgot" ? "Reset your password" : "Welcome to Bukr"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-1">
              {view === "forgot"
                ? "We'll send a reset link to your email."
                : "Sign in or create an account to start booking moments."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* ── FORGOT PASSWORD ── */}
        {view === "forgot" && (
          <div className="space-y-4 animate-fade-in">

            {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}

            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email address</Label>
              <IconInput
                icon={Mail}
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleForgotPassword()}
              />
            </div>

            <Button onClick={handleForgotPassword} variant="glow" className="w-full h-11" disabled={isLoading}>
              {isLoading ? "Sending code..." : "Send reset code"}
            </Button>

            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </button>
          </div>
        )}

        {/* OTP view removed — Supabase sends a magic link, not a code.
            Password reset is handled on /reset-password after redirect. */}

        {/* ── SIGN IN / SIGN UP ── */}
        {view === "auth" && (
          <Tabs defaultValue={defaultTab} className="w-full" onValueChange={clearFeedback}>
            <TabsList className="grid w-full grid-cols-2 glass-card mb-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {feedback && <div className="mt-3"><FeedbackBanner type={feedback.type} message={feedback.message} /></div>}

            {/* ── SIGN IN ── */}
            <TabsContent value="signin" className="space-y-4 mt-4 animate-fade-in">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email">Email</Label>
                <IconInput
                  icon={Mail}
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => { setResetEmail(formData.email); clearFeedback(); setView("forgot"); }}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <IconInput
                    icon={Lock}
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit("signin")}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button onClick={() => handleSubmit("signin")} variant="glow" className="w-full h-11" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </TabsContent>

            {/* ── SIGN UP ── */}
            <TabsContent value="signup" className="space-y-4 mt-4 animate-fade-in">
              {/* Role toggle — pill style */}
              <div className="relative grid grid-cols-2 gap-0 p-1 rounded-xl glass-card border-glass-border">
                {/* Sliding highlight */}
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-primary/20 border border-primary/40 transition-all duration-300 ${userType === "organizer" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"}`}
                />
                <button
                  type="button"
                  onClick={() => setUserType("user")}
                  className={`relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${userType === "user" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <User className="w-4 h-4" /> Attendee
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("organizer")}
                  className={`relative z-10 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${userType === "organizer" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Building className="w-4 h-4" /> Organizer
                </button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-name">Full Name</Label>
                <IconInput
                  icon={UserCircle}
                  id="signup-name"
                  placeholder="What should we call you?"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {userType === "organizer" && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <IconInput
                    icon={Building}
                    id="org-name"
                    placeholder="Your brand, your stage"
                    value={formData.orgName}
                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email</Label>
                <IconInput
                  icon={Mail}
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <IconInput
                    icon={Lock}
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Make it something you'll remember"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrength password={formData.password} />
              </div>

              <Button
                onClick={() => handleSubmit("signup")}
                variant="glow"
                className="w-full h-11"
                disabled={isLoading}
              >
                {isLoading ? "Creating your account..." : `Join as ${userType === "organizer" ? "Organizer" : "Attendee"}`}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
