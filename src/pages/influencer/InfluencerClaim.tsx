import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { claimInfluencerToken } from "@/api/influencer";
import { useUser } from "@/hooks/useUser";

/** Public route — invoked when an influencer follows their invite link. */
export default function InfluencerClaim() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const claimed = useRef(false);

  const mutation = useMutation({
    mutationFn: () => claimInfluencerToken(token!),
    onSuccess: () => {
      toast.success("Welcome to Bukr!", { description: "Your influencer account is now active." });
      navigate("/influencer");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "This invite link has expired or is invalid.";
      toast.error("Couldn't claim invite", { description: msg });
      navigate("/");
    },
  });

  useEffect(() => {
    if (!token) { navigate("/"); return; }
    if (!user) {
      navigate(`/auth?redirect=/influencer/claim/${token}`);
      return;
    }
    if (claimed.current) return;
    claimed.current = true;
    mutation.mutate();
  }, [token, user]);  // eslint-disable-line

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-sm">Claiming your influencer invite...</p>
    </div>
  );
}
