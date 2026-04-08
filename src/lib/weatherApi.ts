// Open-Meteo is free, no API key required.
// Docs: https://open-meteo.com/en/docs

export interface WeatherData {
  temperature: number; // °C
  weatherCode: number; // WMO code
  windspeed: number;   // km/h
}

// WMO weather interpretation codes → emoji + label
export function describeWeather(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Clear' };
  if (code <= 2) return { emoji: '⛅', label: 'Partly cloudy' };
  if (code === 3) return { emoji: '☁️', label: 'Overcast' };
  if (code <= 49) return { emoji: '🌫️', label: 'Foggy' };
  if (code <= 59) return { emoji: '🌦️', label: 'Drizzle' };
  if (code <= 69) return { emoji: '🌧️', label: 'Rain' };
  if (code <= 79) return { emoji: '❄️', label: 'Snow' };
  if (code <= 82) return { emoji: '🌧️', label: 'Showers' };
  if (code <= 99) return { emoji: '⛈️', label: 'Thunderstorm' };
  return { emoji: '🌡️', label: 'Unknown' };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('current_weather', 'true');

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Weather fetch failed');

  const json = await res.json();
  const cw = json.current_weather;
  return {
    temperature: cw.temperature,
    weatherCode: cw.weathercode,
    windspeed: cw.windspeed,
  };
}
