import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Define the structure of the user object
export interface User {
  name: string;
  email: string;
  userType: "user" | "organizer";
  orgName?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signUp: (data: User) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signUp = async (data: User) => {
    console.log('AuthContext signUp called with:', data);
    try {
      // Simulate an API call or connect to your backend
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      console.log('User saved to localStorage:', data);
      
      // Navigate based on user type
      if (data.userType === 'organizer') {
        navigate("/dashboard");
      } else {
        navigate("/app");
      }
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext signIn called with email:', email);
    try {
      // For demo purposes, create a mock user if none exists
      let storedUser = localStorage.getItem("user");
      
      if (!storedUser) {
        // Create a demo user
        const demoUser: User = {
          name: "Demo User",
          email: email,
          userType: "user"
        };
        localStorage.setItem("user", JSON.stringify(demoUser));
        setUser(demoUser);
        navigate("/app");
        return;
      }
      
      const parsedUser = JSON.parse(storedUser) as User;
      console.log('Found stored user:', parsedUser);
      
      // For demo, accept any password
      setUser(parsedUser);
      
      // Navigate based on user type
      if (parsedUser.userType === 'organizer') {
        navigate("/dashboard");
      } else {
        navigate("/app");
      }
    } catch (error) {
      console.error('SignIn error:', error);
      throw new Error("Failed to sign in");
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
