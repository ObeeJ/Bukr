/**
 * PRESENTATION LAYER - Authentication Context
 * 
 * AuthContext: The identity manager - handling user authentication state
 * 
 * Architecture Layer: Presentation (Layer 1)
 * Dependencies: Supabase (auth provider), API clients (user profile)
 * Responsibility: Global authentication state management
 * 
 * Features:
 * - User session management
 * - Sign up with profile completion
 * - Sign in with email/password
 * - Sign out with cleanup
 * - Auth state persistence
 * - Real-time auth state changes
 * 
 * Flow:
 * 1. Check existing session on mount
 * 2. Listen for auth state changes
 * 3. Fetch user profile after authentication
 * 4. Navigate based on user type (user vs organizer)
 * 
 * Integration:
 * - Supabase: JWT authentication
 * - Backend: Profile completion and retrieval
 * - Router: Navigation after auth events
 */

import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@/types";
import { supabase } from "@/lib/supabase";
import { getProfile, completeProfile } from "@/api/users";

// Auth context interface
interface AuthContextType {
  user: User | null;              // Current user profile
  isAuthenticated: boolean;       // Is user logged in?
  isLoading: boolean;             // Loading state
  signUp: (data: SignupData) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Signup data structure
export interface SignupData {
  email: string;
  password: string;
  name: string;
  userType: "user" | "organizer";  // Determines permissions
  orgName?: string;                 // Required for organizers
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider: Global authentication state provider
 * 
 * Manages user session and profile across the app
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  /**
   * Fetch user profile from backend
   * Called after successful authentication
   */
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

  /**
   * Initialize auth state on mount
   * Check for existing session and listen for changes
   */
  useEffect(() => {
    // Safety net — if Supabase never responds, unblock the UI after 3s
    const timeout = setTimeout(() => setIsLoading(false), 3000);

    // getSession handles the initial load — resolves immediately from local storage
    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeout);
      if (session) {
        fetchUserProfile();
      } else {
        setIsLoading(false);
      }
    });

    // onAuthStateChange handles subsequent changes (login, logout, token refresh)
    // Skip INITIAL_SESSION — getSession already handled it above
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (session) {
        fetchUserProfile();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign Up: Create new user account
   * 
   * Flow:
   * 1. Create Supabase auth account
   * 2. Complete profile in backend (set user_type)
   * 3. Fetch full profile
   * 4. Navigate based on user type
   */
  const signUp = async (data: SignupData) => {
    setIsLoading(true);
    try {
      // Store profile data so AuthCallback can complete it after email confirmation.
      // This survives the redirect because it's in localStorage, not memory.
      localStorage.setItem("bukr_pending_profile", JSON.stringify({
        name: data.name,
        userType: data.userType,
        orgName: data.orgName,
      }));

      // 1. Sign up with Supabase — redirectTo tells it where to send the confirmation link
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/#/auth/callback`,
        },
      });

      if (authError) throw authError;

      if (authData.session) {
        // No email confirmation required (e.g. disabled in Supabase dashboard)
        localStorage.removeItem("bukr_pending_profile");
        await completeProfile({ name: data.name, userType: data.userType, orgName: data.orgName });
        await fetchUserProfile();
        navigate(data.userType === 'organizer' ? "/dashboard" : "/app");
      }
      // If session is null, email confirmation is required — AuthCallback handles the rest.
    } catch (error) {
      console.error('SignUp error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign In: Authenticate existing user
   * 
   * Flow:
   * 1. Sign in with Supabase
   * 2. Fetch user profile
   * 3. Navigate to app
   */
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Fetch profile (onAuthStateChange will also trigger this)
      await fetchUserProfile();
      
      // Navigate to app (component protection handles specific routing)
      navigate("/app"); 
      
    } catch (error) {
      console.error('SignIn error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign Out: Clear session and navigate home
   */
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

/**
 * useAuth: Hook to access auth context
 * 
 * Must be used within AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};