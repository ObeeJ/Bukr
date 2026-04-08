// OSRM public demo server — free, no API key.
// For production, self-host or use a paid routing provider.
// Docs: http://project-osrm.org/docs/v5.24.0/api/

export interface RouteEstimate {
  durationMinutes: number;
  distanceKm: number;
}

export async function fetchRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
): Promise<RouteEstimate> {
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Route fetch failed');

  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) throw new Error('No route found');

  return {
    durationMinutes: Math.round(route.duration / 60),
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
  };
}
