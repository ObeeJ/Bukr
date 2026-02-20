// ============================================================================
// SIGN UP PAGE - USER REGISTRATION
// ============================================================================
// Layer 1: PRESENTATION - New user registration interface
//
// ARCHITECTURE ROLE:
// - Handles new user registration
// - Supports two user types: regular user and organizer
// - Conditional fields based on user type (organizers need org name)
// - Client-side validation before API call
//
// REACT PATTERNS:
// 1. Complex Form State: Object with multiple fields
// 2. Conditional Rendering: Show orgName field only for organizers
// 3. Form Validation: Check password match and length before submission
// 4. Select Component: Dropdown for user type selection
//
// FORM STATE:
// - firstName, lastName: Split name for better data structure
// - email: User's email (will be verified)
// - password, confirmPassword: Password with confirmation
// - userType: "user" or "organizer" (affects UI and backend logic)
// - orgName: Required for organizers, optional for users
//
// VALIDATION STRATEGY:
// 1. Client-side: Check password match and length (fast feedback)
// 2. Server-side: Check email uniqueness, format (authoritative)
// 3. HTML5: required, type="email" (browser-level validation)
//
// USER TYPE IMPLICATIONS:
// - Regular users: Can browse and book events
// - Organizers: Can create and manage events
// - This is set at registration and affects entire user experience
// ============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function SignUp() {
  // COMPLEX FORM STATE - Multiple fields in one object
  // This is cleaner than 7 separate useState calls
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "user", // Default to regular user
    orgName: "", // Only used if userType === "organizer"
  });
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  // FORM SUBMISSION WITH VALIDATION
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CLIENT-SIDE VALIDATION - Fast feedback before API call
    // Validation 1: Password match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match 🔒", {
        description: "Please make sure both passwords are identical."
      });
      return; // Early return prevents API call
    }

    // Validation 2: Password length (security requirement)
    if (formData.password.length < 6) {
      toast.error("Password too short 🔑", {
        description: "Password must be at least 6 characters long."
      });
      return;
    }

    // DATA TRANSFORMATION - Prepare data for API
    // Combine firstName and lastName into single name field
    // Only include orgName if user is organizer
    const userData = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      userType: formData.userType as "user" | "organizer", // TypeScript type assertion
      orgName: formData.userType === "organizer" ? formData.orgName : undefined, // Conditional field
    };

    setIsLoading(true);

    try {
      await signUp(userData);
      toast.success("Account created! 🎉", {
        description: "Check your email to verify your account."
      });
      // Note: User needs to verify email before they can sign in
    } catch (error: any) {
      console.error('Sign up error:', error);

      // ERROR HANDLING - User-friendly messages
      if (error.message?.includes('already registered') || error.message?.includes('already exists')) {
        toast.error("Email already taken 📧", {
          description: "This email is already registered. Try signing in instead."
        });
      } else if (error.message?.includes('invalid email')) {
        toast.error("Invalid email format ✉️", {
          description: "Please enter a valid email address."
        });
      } else {
        toast.error("Signup failed 😕", {
          description: error.message || "Something went wrong. Please try again."
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 sm:mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="space-y-4 sm:space-y-6">
          <div className="text-center px-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Create an Account</h1>
            <p className="text-sm text-muted-foreground mt-2">Join us by creating a free account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 glass-card p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="h-11 text-base"
                  required
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter last name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="h-11 text-base"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-11 text-base"
                required
              />
            </div>

            {/* USER TYPE SELECT - Determines user role */}
            {/* This is a controlled Select component from shadcn/ui */}
            <div className="space-y-2">
              <Label htmlFor="userType" className="text-sm font-medium">Account Type</Label>
              <Select value={formData.userType} onValueChange={(value) => setFormData({ ...formData, userType: value })}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* CONDITIONAL FIELD - Only show for organizers */}
            {/* This is React's conditional rendering: condition && <JSX> */}
            {/* If condition is false, React renders nothing */}
            {formData.userType === "organizer" && (
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-sm font-medium">Organization Name</Label>
                <Input
                  id="orgName"
                  placeholder="Enter organization name"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  className="h-11 text-base"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="h-11 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="h-11 text-base"
                required
              />
            </div>

            <Button
              type="submit"
              variant="glow"
              className="w-full h-12 text-base font-medium mt-6 cta"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center px-2">
            <span className="text-sm text-muted-foreground">Already have an account? </span>
            <Link to="/signin" className="text-sm text-primary hover:text-primary-glow transition-colors font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
