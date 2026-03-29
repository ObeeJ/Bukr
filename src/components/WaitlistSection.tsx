/**
 * WaitlistSection — landing page email capture.
 *
 * Fires POST /waitlist (fire-and-forget).
 * Matches the existing landing design system exactly.
 * No external deps beyond what's already in the project.
 */

import { useState } from "react";
import { ArrowRight, Loader2, CheckCircle2, Users } from "lucide-react";
import api from "@/lib/api";

async function joinWaitlist(email: string): Promise<void> {
  await api.post("/waitlist", { email });
}

export default function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail || state === "loading") return;
    setState("loading");
    try {
      await joinWaitlist(email);
      setState("success");
      setEmail("");
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong. Try again.");
      setState("error");
    }
  };

  return (
    <section className="waitlist-section">
      {/* Glow orb behind the section */}
      <div className="waitlist-orb" />

      <div className="waitlist-inner">
        {/* Badge */}
        <div className="landing-badge animate-fade-in">
          <Users className="h-3.5 w-3.5" />
          Early access — limited spots
        </div>

        <h2 className="waitlist-heading">
          Be first when we go live.
        </h2>

        <p className="waitlist-sub">
          We're rolling out city by city. Drop your email and we'll hit you
          the moment Bukr lands in your area.
        </p>

        {state === "success" ? (
          <div className="waitlist-success animate-scale-in">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span>You're on the list. We'll be in touch.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="waitlist-form">
            <div className="waitlist-input-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (state === "error") setState("idle");
                }}
                placeholder="your@email.com"
                className="waitlist-input"
                required
              />
              <button
                type="submit"
                disabled={!isValidEmail || state === "loading"}
                className="waitlist-btn"
              >
                {state === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join waitlist
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
            {state === "error" && (
              <p className="waitlist-error">{errorMsg}</p>
            )}
          </form>
        )}

        {/* Social proof */}
        <p className="waitlist-proof">
          No spam. No noise. Just one email when it's your turn.
        </p>
      </div>
    </section>
  );
}
