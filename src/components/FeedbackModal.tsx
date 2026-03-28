/**
 * FeedbackModal — end-of-journey feedback.
 *
 * 3 questions, no more:
 *   1. Yes / No card — "Would you recommend Bukr?"
 *   2. Emoji rating — "How was your experience?"
 *   3. One optional text — "What's one thing we should improve?" (120 chars)
 *
 * Submits fire-and-forget to POST /feedback.
 * Never blocks the user. Closes on submit or skip.
 */

import { useState } from "react";
import { X, Send, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import type { FeedbackUserType, FeedbackJourney } from "@/hooks/useFeedback";

interface Props {
  open: boolean;
  userType: FeedbackUserType;
  journey: FeedbackJourney;
  onClose: () => void;
}

const RATINGS = [
  { value: 1, emoji: "😤", label: "Terrible" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🤩", label: "Loved it" },
];

const JOURNEY_LABELS: Record<FeedbackJourney, string> = {
  ticket_purchased: "booking your ticket",
  event_created: "creating your event",
  vendor_registered: "joining as a vendor",
  payout_requested: "requesting your payout",
  scan_session_ended: "your scan session",
};

export default function FeedbackModal({ open, userType, journey, onClose }: Props) {
  const [recommend, setRecommend] = useState<boolean | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const canSubmit = recommend !== null && rating !== null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Fire-and-forget — we don't await the result in the UI
      api.post("/feedback", {
        user_type: userType,
        journey,
        recommend,
        rating,
        comment: comment.trim() || null,
      }).catch(() => {
        // Silent — feedback failure never surfaces to user
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRecommend(null);
    setRating(null);
    setComment("");
    setSubmitted(false);
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "hsl(213 90% 3% / 0.75)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-primary/20 p-6 flex flex-col gap-5"
        style={{
          background: "linear-gradient(135deg, hsl(213 60% 8% / 0.95), hsl(213 50% 6% / 0.98))",
          boxShadow: "0 24px 64px hsl(213 100% 4% / 0.6), inset 0 1px 0 hsl(193 100% 75% / 0.1)",
          animation: "slideUpModal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-primary/70 font-clash-grotesk uppercase tracking-widest mb-1">
              Quick feedback
            </p>
            <h2 className="text-lg font-clash font-bold text-white leading-tight">
              How was {JOURNEY_LABELS[journey]}?
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          // Thank-you state
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-4xl">🙏</span>
            <p className="font-clash font-bold text-white text-lg">Thanks for keeping it real.</p>
            <p className="text-sm text-white/40 font-montserrat">
              Your feedback shapes what we build next.
            </p>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Q1 — Yes / No */}
            <div className="space-y-2">
              <p className="text-sm text-white/60 font-montserrat">
                Would you recommend Bukr to a friend?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: true,  label: "Yes, 100%", emoji: "👍" },
                  { val: false, label: "Not yet",   emoji: "👎" },
                ].map(({ val, label, emoji }) => (
                  <button
                    key={String(val)}
                    onClick={() => setRecommend(val)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                      recommend === val
                        ? "border-primary bg-primary/15 text-primary shadow-[0_0_16px_hsl(193_100%_65%/0.15)]"
                        : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2 — Emoji rating */}
            <div className="space-y-2">
              <p className="text-sm text-white/60 font-montserrat">Rate your experience</p>
              <div className="flex justify-between gap-1">
                {RATINGS.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    title={label}
                    className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
                      rating === value
                        ? "border-primary bg-primary/15 scale-105 shadow-[0_0_12px_hsl(193_100%_65%/0.15)]"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span className="text-xl leading-none">{emoji}</span>
                    <span className="text-[10px] text-white/40 font-montserrat hidden sm:block">
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Q3 — Optional text */}
            <div className="space-y-2">
              <p className="text-sm text-white/60 font-montserrat">
                One thing we should improve?{" "}
                <span className="text-white/30">(optional)</span>
              </p>
              <div className="relative">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 120))}
                  placeholder="Be brutally honest. We can take it."
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-primary/40 focus:outline-none focus:ring-0 transition-colors font-montserrat"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-white/25">
                  {comment.length}/120
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white/60 hover:border-white/20 transition-colors font-montserrat"
              >
                Skip
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  canSubmit
                    ? "bg-primary text-primary-foreground hover:shadow-[0_0_20px_hsl(193_100%_65%/0.3)] hover:scale-[1.02]"
                    : "bg-white/5 text-white/25 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
