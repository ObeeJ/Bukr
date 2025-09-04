import React from 'react';

interface EventCardProps {
  event: any;
  onEdit?: (event: any) => void;
}

export const EventCard = ({ event, onEdit }: EventCardProps) => {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold">{event?.title || 'Event'}</h3>
      {onEdit && (
        <button onClick={() => onEdit(event)} className="mt-2 text-sm text-blue-600">
          Edit
        </button>
      )}
    </div>
  );
};