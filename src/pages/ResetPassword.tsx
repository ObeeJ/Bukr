import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import AnimatedLogo from "@/components/AnimatedLogo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sets the session automatically when the user lands here via the reset link.
  // We just wait for onAuthStateChange to confirm it.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    // Also check if session already exists (page reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      setFeedback({ type: "error", message: "Password needs at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setFeedback({ type: "error", message: "Passwords don't match." });
      return;
    }
    setIsLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setFeedback({ type: "success", message: "Password updated! Taking you back to sign in..." });
      setTimeout(() => navigate("/"), 2000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Something went wrong. Try requesting a new reset link." });
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
          <p className="text-sm text-muted-foreground">Choose something strong.</p>
        </div>

        {!sessionReady && (
          <p className="text-sm text-muted-foreground text-center animate-pulse">
            Verifying your reset link...
          </p>
        )}

        {sessionReady && (
          <div className="space-y-4">
            {feedback && (
              <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ${
                feedback.type === "error"
                  ? "bg-destructive/10 border border-destructive/25 text-destructive-foreground"
                  : "bg-success/10 border border-success/25 text-success-foreground"
              }`}>
                {feedback.type === "error"
                  ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
                  : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-green-400" />}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="new-pw"
                  type={showPw ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="confirm-pw"
                  type={showPw ? "text" : "password"}
                  placeholder="Same as above"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  className="pl-9 glass-card border-glass-border bg-glass/20"
                />
              </div>
            </div>

            <Button onClick={handleReset} variant="glow" className="w-full h-11" disabled={isLoading}>
              {isLoading ? "Updating..." : "Set new password"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
