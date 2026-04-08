import React, { useEffect, useState } from 'react';
import { fetchRoute, RouteEstimate } from '@/lib/osrmApi';
import { GeoPosition } from '@/hooks/useGeolocation';
import { Car } from 'lucide-react';

interface TravelEstimateProps {
  userPosition: GeoPosition;
  eventLat: number;
  eventLon: number;
}

// Shows driving time + distance from the user's current location to the event.
// Silently hides itself on any error — never blocks the page.
const TravelEstimate = ({ userPosition, eventLat, eventLon }: TravelEstimateProps) => {
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);

  useEffect(() => {
    fetchRoute(userPosition.lat, userPosition.lon, eventLat, eventLon)
      .then(setEstimate)
      .catch(() => {});
  }, [userPosition.lat, userPosition.lon, eventLat, eventLon]);

  if (!estimate) return null;

  const hours = Math.floor(estimate.durationMinutes / 60);
  const mins = estimate.durationMinutes % 60;
  const duration = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-sm text-white">
      <Car className="h-3.5 w-3.5" />
      <span>{duration} away · {estimate.distanceKm} km</span>
    </div>
  );
};

export default TravelEstimate;
