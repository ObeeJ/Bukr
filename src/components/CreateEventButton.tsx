import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MapPin, Video, Wifi } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreateEventButtonProps {
  variant?: "default" | "outline" | "glow" | "ghost";
  size?: "sm" | "default" | "lg";
  className?: string;
  compact?: boolean;
}

const CreateEventButton = ({ variant = "outline", size = "default", className = "", compact = false }: CreateEventButtonProps) => {
  const navigate = useNavigate();

  const handleCreateEvent = (type: "physical" | "virtual" | "hybrid") => {
    navigate(`/create-event?type=${type}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={`${className}`}>
          <Plus className={compact ? "w-5 h-5" : "w-4 h-4 mr-2"} />
          {compact ? (
            <span className="text-xs font-medium mt-1">Create</span>
          ) : (
            "Create Event"
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="glass-card border-glass-border w-48">
        <DropdownMenuItem 
          onClick={() => handleCreateEvent("physical")}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-glass/20"
        >
          <MapPin className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium">Physical Event</div>
            <div className="text-xs text-muted-foreground">In-person venue</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleCreateEvent("virtual")}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-glass/20"
        >
          <Video className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium">Virtual Event</div>
            <div className="text-xs text-muted-foreground">Online only</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleCreateEvent("hybrid")}
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-glass/20"
        >
          <Wifi className="w-4 h-4 text-primary" />
          <div>
            <div className="font-medium">Hybrid Event</div>
            <div className="text-xs text-muted-foreground">Both in-person & online</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CreateEventButton;