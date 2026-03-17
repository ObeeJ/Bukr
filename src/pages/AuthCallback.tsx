/**
 * AuthCallback — handles Supabase email confirmation and magic link redirects.
 *
 * Supabase sends the user here after they click the confirmation email.
 * The token arrives in window.location.hash (e.g. #access_token=...&type=signup).
 * Supabase's JS SDK picks it up automatically via onAuthStateChange.
 * We just wait for the session, complete the profile if needed, then redirect.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { completeProfile } from "@/api/users";
import AnimatedLogo from "@/components/AnimatedLogo";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase SDK automatically parses the token from the URL hash.
    // onAuthStateChange fires with SIGNED_IN once it's exchanged for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          // Complete profile if metadata indicates this is a fresh signup.
          // The name/userType were stored in localStorage before the email was sent.
          const pending = localStorage.getItem("bukr_pending_profile");
          if (pending) {
            const profileData = JSON.parse(pending);
            await completeProfile(profileData);
            localStorage.removeItem("bukr_pending_profile");
            navigate(profileData.userType === "organizer" ? "/dashboard" : "/app", { replace: true });
          } else {
            navigate("/app", { replace: true });
          }
        } catch {
          // Profile completion failed — still let them in, they can fix it later.
          navigate("/app", { replace: true });
        }
      }

      if (event === "PASSWORD_RECOVERY") {
        navigate("/reset-password", { replace: true });
      }
    });

    // Fallback: if no auth event fires within 5s, something went wrong.
    const timeout = setTimeout(() => {
      setError("This confirmation link has expired or already been used. Please sign in.");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <AnimatedLogo size="md" />
      {error ? (
        <div className="text-center space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => navigate("/auth", { replace: true })}
            className="text-sm text-primary hover:underline"
          >
            Go to sign in
          </button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground animate-pulse">Confirming your account…</p>
      )}
    </div>
  );
};

export default AuthCallback;
