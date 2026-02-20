// ============================================================================
// SIGN IN PAGE - AUTHENTICATION GATEWAY
// ============================================================================
// Layer 1: PRESENTATION - User authentication interface
//
// ARCHITECTURE ROLE:
// - Handles user login via email/password
// - Integrates with AuthContext for global auth state
// - Provides user-friendly error messages (not raw API errors)
// - Supports OAuth providers (Google, Twitter) - UI ready, backend TBD
//
// REACT PATTERNS:
// 1. Controlled Form Inputs: React state controls input values
//    Value flows: User types -> onChange -> setState -> value prop
//    This is "single source of truth" - state is the boss
// 2. Form Submission: preventDefault() stops page reload
// 3. Async/Await: Modern promise handling (cleaner than .then())
// 4. Error Handling: try/catch with user-friendly messages
//
// FORM STATE MANAGEMENT:
// - formData object: Holds email and password
// - showPassword boolean: Toggles password visibility
// - isLoading boolean: Prevents double-submission
//
// ERROR HANDLING STRATEGY:
// - Catch specific error messages from API
// - Translate technical errors to user-friendly language
// - Use toast notifications (non-blocking, auto-dismiss)
//
// UX PATTERNS:
// - Password visibility toggle (eye icon)
// - Remember me checkbox (future feature)
// - Forgot password link (future feature)
// - Loading state on button (prevents double-click)
// ============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AnimatedLogo from "@/components/AnimatedLogo";
import { toast } from "sonner";

const SignIn = () => {
  // CONTEXT CONSUMPTION - Get signIn function from AuthContext
  const { signIn } = useAuth();
  
  // LOCAL STATE - Form-specific state (not global)
  const [showPassword, setShowPassword] = useState(false); // Password visibility toggle
  const [isLoading, setIsLoading] = useState(false); // Prevents double-submission
  
  // CONTROLLED FORM STATE - The "single source of truth" pattern
  // React controls the input values, not the DOM
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  // FORM SUBMISSION HANDLER - The main event
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CRITICAL: Prevents page reload (default form behavior)
    setIsLoading(true); // Disable submit button

    try {
      // Call AuthContext signIn method (which calls API)
      await signIn(formData.email, formData.password);
      
      // SUCCESS: Show success toast
      toast.success("Welcome back! 🎉", {
        description: "You've successfully signed in."
      });
      // Note: Navigation happens automatically in AuthContext after successful login
    } catch (err: any) {
      console.error('Sign in error:', err);

      // ERROR HANDLING - Translate technical errors to human language
      // This is UX gold: users don't care about HTTP status codes
      if (err.message?.includes('Invalid login credentials')) {
        toast.error("Oops! Wrong credentials 🔐", {
          description: "Double-check your email and password, then try again."
        });
      } else if (err.message?.includes('Email not confirmed')) {
        toast.error("Email not verified ✉️", {
          description: "Please check your inbox and verify your email first."
        });
      } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
        toast.error("Connection issue 📡", {
          description: "Check your internet connection and try again."
        });
      } else {
        // Fallback for unknown errors
        toast.error("Couldn't sign in 😕", {
          description: err.message || "Something went wrong. Please try again."
        });
      }
    } finally {
      setIsLoading(false); // Re-enable submit button (runs whether success or error)
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md mx-auto">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 sm:mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Sign In Form */}
        <div className="glass-card p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="text-center space-y-2 px-2">
            <div className="mb-4">
              <AnimatedLogo size="md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-glow">Welcome Back</h1>
            <p className="text-sm text-muted-foreground">Sign in to your Bukr account</p>
          </div>



          {/* FORM - Controlled components pattern */}
          {/* Each input's value is controlled by React state */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* EMAIL INPUT - Standard controlled input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              {/* HTML5 validation: must be valid email format */}
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="glass-card border-glass-border bg-glass/20 h-11 text-base"
                required
              />
            </div>

            {/* PASSWORD INPUT - With visibility toggle */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              {/* Relative positioning for absolute button */}
              <div className="relative">
                {/* Dynamic type based on state */}
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-card border-glass-border bg-glass/20 pr-10 h-11 text-base"
                  required
                />
                {/* TOGGLE BUTTON - Absolute positioned inside input */}
                {/* CRITICAL: type="button" prevents form submission */}
                {/* Toggle boolean state */}
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

            {/* REMEMBER ME & FORGOT PASSWORD - Future features */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-primary hover:text-primary-glow transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* SUBMIT BUTTON - With loading state */}
            {/* disabled prop prevents double-submission */}
            {/* type="submit" triggers form onSubmit */}
            {/* Disable during API call */}
            <Button
              type="submit"
              variant="glow"
              className="w-full h-12 text-base font-medium mt-6 cta"
              disabled={isLoading}
            >
              {/* CONDITIONAL TEXT - Show loading state */}
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* OAUTH BUTTONS - UI ready, backend integration pending */}
          {/* This is common in MVPs: build UI first, wire up later */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-glass-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-background px-4 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-11 text-sm">Google</Button>
              <Button variant="outline" className="h-11 text-sm">Twitter</Button>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center space-y-2">
            <div>
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link to="/signup" className="text-primary hover:text-primary-glow transition-colors font-medium">
                Sign up
              </Link>
            </div>
            <div>
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                New here? View Landing Page
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
