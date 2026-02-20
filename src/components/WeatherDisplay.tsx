// ============================================================================
// WEATHER DISPLAY - EVENT WEATHER PREDICTION
// ============================================================================
// Layer 1: PRESENTATION - Weather widget for events
//
// ARCHITECTURE ROLE:
// - Displays weather forecast for event date/location
// - Helps users plan (bring umbrella, dress warm, etc.)
// - Enhances event cards with contextual information
//
// REACT PATTERNS:
// 1. Prop-based Configuration: size, showDescription props
// 2. Switch Statement: Map condition to icon
// 3. Conditional Rendering: Show/hide description
// 4. Utility Function: cn() for conditional classes
//
// COMPONENT PROPS:
// - weather: Object with condition, temperature, description
// - size: "sm" | "md" | "lg" (responsive sizing)
// - showDescription: Boolean to show/hide text
//
// WEATHER API INTEGRATION:
// - Currently uses mock data (getWeatherPrediction function)
// - In production, would call real weather API (OpenWeather, WeatherAPI, etc.)
// - Caches results to avoid excessive API calls
//
// ICON MAPPING:
// - sunny -> Sun icon (yellow)
// - cloudy -> Cloud icon (gray)
// - rainy -> CloudRain icon (blue)
// - snowy -> CloudSnow icon (light blue)
// - stormy -> Zap icon (red)
//
// UX CONSIDERATIONS:
// - Color-coded icons (visual recognition)
// - Temperature in Fahrenheit (US standard, should be configurable)
// - Compact display (doesn't overwhelm event card)
// - Optional description (show on detail page, hide on card)
// ============================================================================

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
  // ICON MAPPING FUNCTION - Switch statement for clarity
  // Could use object lookup, but switch is more readable for this case
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case "sunny": return <Sun className="text-warning" />; // Yellow sun
      case "cloudy": return <Cloud className="text-muted-foreground" />; // Gray cloud
      case "rainy": return <CloudRain className="text-primary" />; // Blue rain
      case "snowy": return <CloudSnow className="text-accent" />; // Light blue snow
      case "stormy": return <Zap className="text-destructive" />; // Red lightning
      default: return <Sun className="text-warning" />; // Fallback to sunny
    }
  };

  // SIZE CONFIGURATION - Responsive sizing
  // These objects map size prop to Tailwind classes
  const sizeClasses = {
    sm: "w-4 h-4",   // 16px - for compact cards
    md: "w-5 h-5",   // 20px - default
    lg: "w-6 h-6"    // 24px - for detail pages
  };

  const textSizes = {
    sm: "text-xs",   // 12px
    md: "text-sm",   // 14px
    lg: "text-base"  // 16px
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

// MOCK WEATHER SERVICE - Simulates API call
// In production, replace with real weather API integration
// Popular options: OpenWeatherMap, WeatherAPI, Tomorrow.io
export const getWeatherPrediction = async (date: string, location: string): Promise<WeatherData> => {
  // Simulate network delay (real APIs take time)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // MOCK DATA GENERATION - Random but realistic
  const conditions: WeatherData["condition"][] = ["sunny", "cloudy", "rainy", "snowy", "stormy"];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // Temperature ranges based on condition (realistic correlation)
  const temperatures = {
    sunny: Math.floor(Math.random() * 20) + 70,  // 70-90°F
    cloudy: Math.floor(Math.random() * 15) + 60, // 60-75°F
    rainy: Math.floor(Math.random() * 15) + 55,  // 55-70°F
    snowy: Math.floor(Math.random() * 20) + 20,  // 20-40°F
    stormy: Math.floor(Math.random() * 15) + 50  // 50-65°F
  };

  // Human-readable descriptions
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