import { Cloud, Sun, CloudRain, Thermometer } from "lucide-react";

interface WeatherWidgetProps {
  date: string;
  location: string;
}

const WeatherWidget = ({ date, location }: WeatherWidgetProps) => {
  // Mock weather data - in real app this would come from weather API
  const weatherData = {
    temperature: 72,
    condition: "partly-cloudy",
    humidity: 65,
    description: "Partly cloudy with a chance of light showers"
  };

  const getWeatherIcon = () => {
    switch (weatherData.condition) {
      case "sunny":
        return <Sun className="w-6 h-6 text-warning" />;
      case "partly-cloudy":
        return <Cloud className="w-6 h-6 text-muted-foreground" />;
      case "rainy":
        return <CloudRain className="w-6 h-6 text-accent" />;
      default:
        return <Sun className="w-6 h-6 text-warning" />;
    }
  };

  return (
    <div className="glass-card p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">Weather Forecast</h4>
        <div className="text-xs text-muted-foreground">{date}</div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getWeatherIcon()}
          <div>
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold text-foreground">{weatherData.temperature}°F</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {weatherData.description}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Humidity</div>
          <div className="text-sm font-medium text-foreground">{weatherData.humidity}%</div>
        </div>
      </div>
    </div>
  );
};

export default WeatherWidget;