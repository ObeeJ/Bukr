import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, User, Building, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import AnimatedLogo from "./AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

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
  if (type === "forgot")
    return "Couldn't send the reset email. Double-check the address and try again.";
  if (type === "otp")
    return "Code verification failed. Try requesting a fresh one.";
  return type === "signin"
    ? "Something went sideways. Try again — we believe in you."
    : "Signup hit a snag. Try again in a moment.";
};

const FeedbackBanner = ({ type, message }: { type: "error" | "success"; message: string }) => (
  <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
    type === "error"
      ? "bg-destructive/15 border border-destructive/30 text-destructive-foreground"
      : "bg-success/15 border border-success/30 text-success-foreground"
  }`}>
    {type === "error"
      ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-destructive" />
      : <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-success" />
    }
    <span>{message}</span>
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
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        // OTP flow — no redirect link, user enters code manually
        redirectTo: undefined,
      });
      if (error) throw error;
      setFeedback({
        type: "success",
        message: "Code sent! Check your inbox — it expires in 10 minutes.",
      });
      // Move to OTP view after a beat so user reads the success message
      setTimeout(() => {
        clearFeedback();
        setView("otp");
      }, 1500);
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error, "forgot") });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otpCode.length < 6) {
      setFeedback({ type: "error", message: "The code is 6 digits — check your email again." });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: "error", message: "New password needs at least 6 characters." });
      return;
    }
    clearFeedback();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: resetEmail,
        token: otpCode,
        type: "recovery",
      });
      if (error) throw error;

      // OTP verified — now update the password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setFeedback({ type: "success", message: "Password updated! You're all set — sign in with your new one." });
      setTimeout(() => {
        goBack();
      }, 2000);
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error, "otp") });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-4">
            <AnimatedLogo size="md" className="mb-2" />
            <DialogTitle className="text-foreground">
              {view === "forgot" ? "Reset your password" : view === "otp" ? "Enter your code" : "Welcome to Bukr"}
            </DialogTitle>
            <DialogDescription>
              {view === "forgot"
                ? "We'll send a 6-digit code to your email."
                : view === "otp"
                ? `Code sent to ${resetEmail}. Enter it below with your new password.`
                : "Sign in or create an account to start booking moments."}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* ── FORGOT PASSWORD VIEW ─────────────────────────────────── */}
        {view === "forgot" && (
          <div className="space-y-4">
            {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}
            <div>
              <Label htmlFor="reset-email">Email address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="glass-card border-glass-border bg-glass/20 mt-1"
              />
            </div>
            <Button onClick={handleForgotPassword} variant="glow" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending code..." : "Send reset code"}
            </Button>
            <button
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Back to sign in
            </button>
          </div>
        )}

        {/* ── OTP + NEW PASSWORD VIEW ──────────────────────────────── */}
        {view === "otp" && (
          <div className="space-y-4">
            {feedback && <FeedbackBanner type={feedback.type} message={feedback.message} />}
            <div>
              <Label htmlFor="otp-code">6-digit code</Label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                className="glass-card border-glass-border bg-glass/20 mt-1 tracking-widest text-center text-lg"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="glass-card border-glass-border bg-glass/20 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button onClick={handleOtpVerify} variant="glow" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Set new password"}
            </Button>
            <button
              onClick={() => { setView("forgot"); clearFeedback(); }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <ArrowLeft className="w-3 h-3" /> Resend code
            </button>
          </div>
        )}

        {/* ── SIGN IN / SIGN UP VIEW ───────────────────────────────── */}
        {view === "auth" && (
          <Tabs defaultValue={defaultTab} className="w-full" onValueChange={clearFeedback}>
            <TabsList className="grid w-full grid-cols-2 glass-card">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {feedback && (
              <div className="mt-3">
                <FeedbackBanner type={feedback.type} message={feedback.message} />
              </div>
            )}

            <TabsContent value="signin" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="glass-card border-glass-border bg-glass/20"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="signin-password">Password</Label>
                    {/* Forgot password — opens inline, no page redirect */}
                    <button
                      type="button"
                      onClick={() => { setResetEmail(formData.email); clearFeedback(); setView("forgot"); }}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="glass-card border-glass-border bg-glass/20 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => handleSubmit("signin")}
                  variant="glow"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={userType === "user" ? "glow" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => setUserType("user")}
                >
                  <User className="w-4 h-4" />
                  I'm a User
                </Button>
                <Button
                  type="button"
                  variant={userType === "organizer" ? "glow" : "outline"}
                  className="flex items-center gap-2"
                  onClick={() => setUserType("organizer")}
                >
                  <Building className="w-4 h-4" />
                  I'm an Organizer
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    placeholder="What should we call you?"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="glass-card border-glass-border bg-glass/20"
                  />
                </div>

                {userType === "organizer" && (
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      placeholder="Your brand, your stage"
                      value={formData.orgName}
                      onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                      className="glass-card border-glass-border bg-glass/20"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="glass-card border-glass-border bg-glass/20"
                  />
                </div>

                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Make it something you'll remember"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="glass-card border-glass-border bg-glass/20 pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => handleSubmit("signup")}
                  variant="glow"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading
                    ? "Creating your account..."
                    : `Join as ${userType === "organizer" ? "Organizer" : "User"}`}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
