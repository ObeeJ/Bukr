import React, { useEffect, useState } from 'react';
import { fetchWeather, describeWeather, WeatherData } from '@/lib/weatherApi';
import { Wind } from 'lucide-react';

interface WeatherBadgeProps {
  lat: number;
  lon: number;
}

// Shows current weather at the event venue.
// Only renders when the event has coordinates — no coords, no badge.
const WeatherBadge = ({ lat, lon }: WeatherBadgeProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetchWeather(lat, lon).then(setWeather).catch(() => {});
  }, [lat, lon]);

  if (!weather) return null;

  const { emoji, label } = describeWeather(weather.weatherCode);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm text-white">
      <span>{emoji}</span>
      <span>{label} · {Math.round(weather.temperature)}°C</span>
      <Wind className="h-3.5 w-3.5 opacity-70" />
      <span className="opacity-70">{Math.round(weather.windspeed)} km/h</span>
    </div>
  );
};

export default WeatherBadge;
