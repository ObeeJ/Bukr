import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, User, Building } from "lucide-react";
import AnimatedLogo from "./AnimatedLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
}

const AuthModal = ({ isOpen, onClose, defaultTab = "signin" }: AuthModalProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<"user" | "organizer">("user");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    orgName: "",
    phone: ""
  });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (type: "signin" | "signup") => {
    // In a real app, we would validate and make API calls here
    const userId = `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create user object
    const userData = {
      id: userId,
      name: formData.name || 'Demo User', // Default name for signin
      email: formData.email,
      userType: userType,
      orgName: userType === 'organizer' ? formData.orgName : undefined
    };
    
    // Login the user
    login(userData);
    onClose();
    
    // Navigate to appropriate dashboard
    if (userType === 'organizer') {
      navigate('/dashboard');
    } else {
      navigate('/app');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-glass-border max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-4">
            <AnimatedLogo size="md" className="mb-2" />
            <DialogTitle className="text-foreground">Welcome to Bukr</DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass-card">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="glass-card border-glass-border bg-glass/20"
                />
              </div>
              <div>
                <Label htmlFor="signin-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              >
                Sign In
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            {/* User Type Selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <Button
                type="button"
                variant={userType === "user" ? "glow" : "outline"}
                className="flex items-center gap-2"
                onClick={() => setUserType("user")}
              >
                <User className="w-4 h-4" />
                User
              </Button>
              <Button
                type="button"
                variant={userType === "organizer" ? "glow" : "outline"}
                className="flex items-center gap-2"
                onClick={() => setUserType("organizer")}
              >
                <Building className="w-4 h-4" />
                Organizer
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="glass-card border-glass-border bg-glass/20"
                />
              </div>

              {userType === "organizer" && (
                <div>
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Enter organization name"
                    value={formData.orgName}
                    onChange={(e) => setFormData({...formData, orgName: e.target.value})}
                    className="glass-card border-glass-border bg-glass/20"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="glass-card border-glass-border bg-glass/20"
                />
              </div>

              <div>
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
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
              >
                Sign Up as {userType === "organizer" ? "Organizer" : "User"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;