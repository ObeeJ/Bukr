import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import AnimatedLogo from "@/components/AnimatedLogo";

const SignIn = () => {
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signIn(formData.email, formData.password);
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
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

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-md text-sm text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
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

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="glass-card border-glass-border bg-glass/20 pr-10 h-11 text-base"
                  required
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-primary hover:text-primary-glow transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="glow" className="w-full h-12 text-base font-medium mt-6">
              Sign In
            </Button>
          </form>

          {/* OAuth Buttons (optional) */}
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
