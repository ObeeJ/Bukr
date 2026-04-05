// FavoriteButton — self-contained heart toggle.
// Checks API state on mount, toggles optimistically, rolls back on error.

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { addFavorite, removeFavorite, checkFavorite } from "@/api/favorites";
import { toast } from "sonner";

interface FavoriteButtonProps {
  eventId: string;
  initialFavorite?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const FavoriteButton = ({ eventId, initialFavorite, size = "md", className }: FavoriteButtonProps) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite ?? false);

  // If no initialFavorite provided, check the API on mount
  useEffect(() => {
    if (initialFavorite !== undefined) return;
    let cancelled = false;
    checkFavorite(eventId).then(val => { if (!cancelled) setIsFavorite(val); });
    return () => { cancelled = true; };
  }, [eventId, initialFavorite]);

  // Sync if parent changes the prop
  useEffect(() => {
    if (initialFavorite !== undefined) setIsFavorite(initialFavorite);
  }, [initialFavorite]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) {
        await addFavorite(eventId);
        toast.success("Added to favorites");
      } else {
        await removeFavorite(eventId);
        toast("Removed from favorites");
      }
    } catch {
      setIsFavorite(!next);
      toast.error("Failed to update favorites");
    }
  };

  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconDim = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <button
      onClick={handleToggle}
      className={cn(
        dim,
        "rounded-full transition-all duration-300 flex items-center justify-center",
        "hover:scale-110 hover:shadow-lg backdrop-blur-sm",
        isFavorite
          ? "bg-primary/20 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          : "bg-background/20 border border-glass-border/50 hover:bg-background/40",
        className,
      )}
    >
      <Heart
        className={cn(
          iconDim,
          "transition-all duration-300",
          isFavorite
            ? "text-primary fill-primary"
            : "text-white hover:text-foreground",
        )}
      />
    </button>
  );
};

export default FavoriteButton;
