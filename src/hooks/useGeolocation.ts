import { useState, useEffect } from 'react';

export interface GeoPosition {
  lat: number;
  lon: number;
}

interface GeolocationState {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
}

// Requests the browser's geolocation once on mount.
// Components that need user coords (weather, routing) consume this hook.
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ position: null, error: 'Geolocation not supported', loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setState({ position: { lat: coords.latitude, lon: coords.longitude }, error: null, loading: false }),
      (err) =>
        setState({ position: null, error: err.message, loading: false }),
      { timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  return state;
}
