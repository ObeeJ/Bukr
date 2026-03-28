/**
 * useFeedback — controls when the feedback modal fires.
 *
 * Rules:
 * - One trigger per user per journey key per calendar day.
 * - Stored in localStorage so it survives page reloads but resets daily.
 * - Fire-and-forget: never blocks the user's next action.
 */

import { useState, useCallback } from "react";

export type FeedbackUserType = "user" | "organizer" | "vendor" | "influencer" | "scanner";

// Journey keys map to specific completion moments
export type FeedbackJourney =
  | "ticket_purchased"
  | "event_created"
  | "vendor_registered"
  | "payout_requested"
  | "scan_session_ended";

interface FeedbackState {
  open: boolean;
  userType: FeedbackUserType;
  journey: FeedbackJourney;
}

const STORAGE_KEY = "bukr_feedback_shown";

function getTodayKey(userId: string, journey: FeedbackJourney): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${userId}:${journey}:${today}`;
}

function hasShownToday(userId: string, journey: FeedbackJourney): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const shown: string[] = raw ? JSON.parse(raw) : [];
    return shown.includes(getTodayKey(userId, journey));
  } catch {
    return false;
  }
}

function markShown(userId: string, journey: FeedbackJourney): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const shown: string[] = raw ? JSON.parse(raw) : [];
    const key = getTodayKey(userId, journey);
    if (!shown.includes(key)) {
      // Keep only last 50 entries — no unbounded growth
      const trimmed = shown.slice(-49);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...trimmed, key]));
    }
  } catch {
    // localStorage unavailable — silent fail, never block UX
  }
}

export function useFeedback() {
  const [state, setState] = useState<FeedbackState | null>(null);

  // Call this at the exact moment a journey completes
  const triggerFeedback = useCallback(
    (userId: string, userType: FeedbackUserType, journey: FeedbackJourney) => {
      if (!userId || hasShownToday(userId, journey)) return;
      // Small delay so the success state renders first
      setTimeout(() => {
        setState({ open: true, userType, journey });
        markShown(userId, journey);
      }, 1200);
    },
    []
  );

  const closeFeedback = useCallback(() => {
    setState(null);
  }, []);

  return {
    feedbackState: state,
    triggerFeedback,
    closeFeedback,
  };
}
