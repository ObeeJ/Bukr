import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExcitementRatingProps {
  onRatingChange: (rating: number) => void;
  value?: number;
}

const ExcitementRating = ({ onRatingChange, value = 0 }: ExcitementRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedRating, setSelectedRating] = useState(value);

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating);
    onRatingChange(rating);
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return "Not excited";
      case 2: return "A little excited";
      case 3: return "Moderately excited";
      case 4: return "Very excited";
      case 5: return "Extremely excited!";
      default: return "How excited are you?";
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-foreground mb-2">Rate Your Excitement</h4>
        <p className="text-sm text-muted-foreground">
          {getRatingText(hoverRating || selectedRating)}
        </p>
      </div>
      
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => handleRatingClick(rating)}
            onMouseEnter={() => setHoverRating(rating)}
            onMouseLeave={() => setHoverRating(0)}
            className={cn(
              "w-12 h-12 rounded-full transition-all duration-300 flex items-center justify-center",
              "hover:scale-110 hover:shadow-[var(--shadow-glow)]",
              (hoverRating >= rating || selectedRating >= rating)
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "bg-glass/30 text-muted-foreground hover:bg-glass/50"
            )}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-all duration-300",
                (hoverRating >= rating || selectedRating >= rating)
                  ? "fill-current"
                  : ""
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExcitementRating;