import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  eventId: string;
  initialFavorite?: boolean;
  onToggle?: (eventId: string, isFavorite: boolean) => void;
}

const FavoriteButton = ({ eventId, initialFavorite = false, onToggle }: FavoriteButtonProps) => {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  const handleToggle = () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    onToggle?.(eventId, newFavoriteState);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        "w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center",
        "hover:scale-110 hover:shadow-lg backdrop-blur-sm",
        isFavorite
          ? "bg-primary/20 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          : "bg-glass/20 border border-glass-border/50 hover:bg-glass/40"
      )}
    >
      <Heart
        className={cn(
          "w-5 h-5 transition-all duration-300",
          isFavorite
            ? "text-primary fill-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      />
    </button>
  );
};

export default FavoriteButton;