import { Cloud, Sun, CloudRain, CloudSnow, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherData {
  condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy";
  temperature: number;
  description: string;
}

interface WeatherDisplayProps {
  weather: WeatherData;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
}

const WeatherDisplay = ({ weather, size = "md", showDescription = true }: WeatherDisplayProps) => {
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "sunny": return <Sun className="text-warning" />;
      case "cloudy": return <Cloud className="text-muted-foreground" />;
      case "rainy": return <CloudRain className="text-primary" />;
      case "snowy": return <CloudSnow className="text-accent" />;
      case "stormy": return <Zap className="text-destructive" />;
      default: return <Sun className="text-warning" />;
    }
  };

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const textSizes = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={cn(
      "flex items-center gap-2",
      size === "sm" && "text-xs",
      size === "lg" && "text-base"
    )}>
      <div className={sizeClasses[size]}>
        {getWeatherIcon(weather.condition)}
      </div>
      <span className={cn("font-medium text-foreground", textSizes[size])}>
        {weather.temperature}°F
      </span>
      {showDescription && (
        <span className={cn("text-muted-foreground", textSizes[size])}>
          {weather.description}
        </span>
      )}
    </div>
  );
};

// Mock weather service - in real app this would call a weather API
export const getWeatherPrediction = async (date: string, location: string): Promise<WeatherData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock weather data based on date/location
  const conditions: WeatherData["condition"][] = ["sunny", "cloudy", "rainy", "snowy", "stormy"];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  const temperatures = {
    sunny: Math.floor(Math.random() * 20) + 70,
    cloudy: Math.floor(Math.random() * 15) + 60,
    rainy: Math.floor(Math.random() * 15) + 55,
    snowy: Math.floor(Math.random() * 20) + 20,
    stormy: Math.floor(Math.random() * 15) + 50
  };

  const descriptions = {
    sunny: "Clear skies",
    cloudy: "Partly cloudy",
    rainy: "Light rain",
    snowy: "Snow showers",
    stormy: "Thunderstorms"
  };

  return {
    condition: randomCondition,
    temperature: temperatures[randomCondition],
    description: descriptions[randomCondition]
  };
};

export default WeatherDisplay;