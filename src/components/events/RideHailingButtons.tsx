import React from 'react';
import { Button } from '@/components/ui/button';

interface RideHailingButtonsProps {
  lat: number;
  lon: number;
  locationName: string;
}

// Builds deep-link URLs for Uber and Bolt with the event venue pre-filled.
// Falls back to web URLs on desktop where the apps aren't installed.
const RideHailingButtons = ({ lat, lon, locationName }: RideHailingButtonsProps) => {
  const encodedName = encodeURIComponent(locationName);

  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${lat}&dropoff[longitude]=${lon}&dropoff[nickname]=${encodedName}`;
  const boltUrl = `https://bolt.eu/en/ride/?lat=${lat}&lng=${lon}`;

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
        onClick={() => window.open(uberUrl, '_blank', 'noopener')}
      >
         Uber
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 border-white/20 bg-white/10 text-white hover:bg-white/20"
        onClick={() => window.open(boltUrl, '_blank', 'noopener')}
      >
         Bolt
      </Button>
    </div>
  );
};

export default RideHailingButtons;
