import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { getProfile, completeProfile } from "@/api/users";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signUp: (data: SignupData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface SignupData {
  email: string;
  password: string;
  name: string;
  userType: "user" | "organizer";
  orgName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile();
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserProfile();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (data: SignupData) => {
    setIsLoading(true);
    try {
      // 1. Sign up with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) throw authError;

      if (authData.session) {
        // 2. Call backend to complete profile
        await completeProfile({
          name: data.name,
          userType: data.userType,
          orgName: data.orgName,
        });

        // 3. Fetch full profile
        await fetchUserProfile();

        // 4. Navigate
        if (data.userType === 'organizer') {
          navigate("/dashboard");
        } else {
          navigate("/app");
        }
      } else {
        // Handle case where email confirmation is required
        alert("Please check your email to confirm your account.");
      }
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // onAuthStateChange will trigger fetchUserProfile and navigation could happen there,
      // but we can also do it here explicitly if we want to wait for profile.
      await fetchUserProfile();
      
      // We need the user state to be updated to know where to navigate,
      // but state updates are async. We can check the fetched profile or just default to /app 
      // and let the component protection handle redirection if needed.
      // For now, let's just go to /app (or dashboard if we knew)
      navigate("/app"); 
      
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate("/");
    } catch (error) {
      console.error('SignOut error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};