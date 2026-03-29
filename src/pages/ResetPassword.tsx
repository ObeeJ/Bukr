import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";
import api from "@/lib/api";

// ── OTP digit boxes ───────────────────────────────────────────────────────────
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
          className="w-11 h-12 text-center text-lg font-semibold rounded-xl border glass-card border-glass-border bg-glass/20 focus:outline-none focus:ring-2 focus:ring-primary/60 transition-all caret-primary"
        />
      ))}
    </div>
  );
};

// ── Feedback banner ───────────────────────────────────────────────────────────
const Feedback = ({ type, msg }: { type: "error" | "success"; msg: string }) => (
  <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
    type === "error"
      ? "bg-destructive/10 border border-destructive/25 text-destructive-foreground"
      : "bg-green-500/10 border border-green-500/25 text-green-400"
  }`}>
    {type === "error"
      ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
      : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />}
    <span>{msg}</span>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") ?? "";

  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; msg: string } | null>(null);

  const handleReset = async () => {
    if (otp.length < 6) {
      setFeedback({ type: "error", msg: "Enter the full 6-digit code from your email." });
      return;
    }
    if (password.length < 8) {
      setFeedback({ type: "error", msg: "Password must be at least 8 characters." });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const { data } = await api.post("/auth/reset-password", {
        email: email.trim().toLowerCase(),
        otp,
        password,
      });
      void data; // response body not needed
      setFeedback({ type: "success", msg: "Password updated. Taking you to sign in." });
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message || "Something went wrong. Request a new code." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card border-glass-border w-full max-w-sm p-8 space-y-6 animate-scale-in">
        <div className="text-center space-y-1">
          <AnimatedLogo size="md" className="mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your email and choose a new password.
          </p>
        </div>

        <div className="space-y-5">
          {feedback && <Feedback type={feedback.type} msg={feedback.msg} />}

          {!prefillEmail && (
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-card border-glass-border bg-glass/20"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="block text-center">Reset code</Label>
            <OtpInput value={otp} onChange={setOtp} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-pw">New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                id="new-pw"
                type={showPw ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                className="pl-9 pr-10 glass-card border-glass-border bg-glass/20"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button onClick={handleReset} variant="glow" className="w-full h-11" disabled={isLoading}>
            {isLoading ? "Updating..." : "Set new password"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Code expired?{" "}
            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Request a new one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
