// ============================================================================
// FAVORITE BUTTON - INTERACTIVE LIKE BUTTON
// ============================================================================
// Layer 1: PRESENTATION - Reusable favorite toggle component
//
// ARCHITECTURE ROLE:
// - Provides consistent favorite UI across app
// - Manages local state (optimistic UI)
// - Calls parent callback for persistence
//
// REACT PATTERNS:
// 1. Controlled Component: Parent can control initial state
// 2. Callback Props: onToggle notifies parent of changes
// 3. Optional Chaining: onToggle?.() safely calls if exists
// 4. Conditional Styling: Different styles based on state
//
// COMPONENT PROPS:
// - eventId: Identifies which event to favorite
// - initialFavorite: Initial state (from API/cache)
// - onToggle: Callback when user clicks (parent handles API call)
//
// STATE MANAGEMENT:
// - Local state: isFavorite (for immediate UI feedback)
// - Parent state: Actual favorite status (source of truth)
// - This is "optimistic UI" - update UI immediately, sync with server later
//
// STYLING PATTERNS:
// - cn() utility: Merges Tailwind classes conditionally
// - Transition classes: Smooth animations on state change
// - Fill vs stroke: Filled heart when favorited, outline when not
// - Glow effect: Shadow animation when favorited
//
// UX CONSIDERATIONS:
// - Immediate feedback (no loading spinner)
// - Visual distinction (filled vs outline)
// - Hover effects (scale up on hover)
// - Touch-friendly size (w-10 h-10 = 40px, good for mobile)
// ============================================================================

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  eventId: string;
  initialFavorite?: boolean;
  onToggle?: (eventId: string, isFavorite: boolean) => void;
}

const FavoriteButton = ({ eventId, initialFavorite = false, onToggle }: FavoriteButtonProps) => {
  // LOCAL STATE - Optimistic UI pattern
  // Update immediately, don't wait for API response
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  // TOGGLE HANDLER - Update local state and notify parent
  const handleToggle = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState); // Update UI immediately
    onToggle?.(eventId, newFavoriteState); // Notify parent (optional chaining: only call if exists)
    // Parent will handle API call and error handling
    // If API fails, parent should call this component with initialFavorite=false to revert
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        // BASE STYLES - Always applied
        "w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center",
        "hover:scale-110 hover:shadow-lg backdrop-blur-sm", // Hover effects
        // CONDITIONAL STYLES - Based on favorite state
        isFavorite
          ? "bg-primary/20 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.3)]" // Favorited: glowing effect
          : "bg-glass/20 border border-glass-border/50 hover:bg-glass/40" // Not favorited: subtle
      )}
    >
      {/* HEART ICON - Conditional fill */}
      <Heart
        className={cn(
          "w-5 h-5 transition-all duration-300",
          isFavorite
            ? "text-primary fill-primary" // Filled heart (both stroke and fill)
            : "text-muted-foreground hover:text-foreground" // Outline heart (stroke only)
        )}
      />
    </button>
  );
};

export default FavoriteButton;