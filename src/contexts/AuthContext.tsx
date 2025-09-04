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
    // Simulate an API call or connect to your backend
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
    navigate("/dashboard");
  };

  const signIn = async (email: string, password: string) => {
    // Simulate login (replace with real logic)
    const storedUser = localStorage.getItem("user");
    if (!storedUser) throw new Error("User not found");
    const parsedUser = JSON.parse(storedUser) as User;
    if (parsedUser.email !== email) throw new Error("Invalid credentials");

    setUser(parsedUser);
    navigate("/dashboard");
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
