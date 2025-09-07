import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SignUp() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "user",
    orgName: "",
  });

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign up form submitted:', formData);

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const userData = {
      name: `${formData.firstName} ${formData.lastName}`,
      email: formData.email,
      userType: formData.userType as "user" | "organizer",
      orgName: formData.userType === "organizer" ? formData.orgName : undefined,
    };

    console.log('User data to submit:', userData);

    try {
      await signUp(userData);
      console.log('Sign up successful');
    } catch (error: any) {
      console.error('Sign up error:', error);
      alert("Signup failed: " + (error.message || 'Unknown error'));
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

          <Button type="submit" variant="glow" className="w-full h-12 text-base font-medium mt-6">Sign Up</Button>
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
