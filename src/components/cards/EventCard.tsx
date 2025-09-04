import React from 'react';

interface EventCardProps {
  event: any;
  onEdit?: (event: any) => void;
}

export const EventCard = ({ event, onEdit }: EventCardProps) => {
  return (
    <div className="glass-card p-4 sm:p-6 hover:shadow-lg transition-all duration-200">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-base sm:text-lg leading-tight">{event?.title || 'Event'}</h3>
          {event?.category && (
            <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded-full">
              {event.category}
            </span>
          )}
        </div>
        
        {event?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
        )}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          {event?.price && (
            <span className="font-medium text-primary">
              {typeof event.price === 'number' ? `₦${event.price.toLocaleString()}` : event.price}
            </span>
          )}
          
          {onEdit && (
            <button 
              onClick={() => onEdit(event)} 
              className="text-sm text-primary hover:text-primary-glow transition-colors touch-target px-3 py-1 rounded-md hover:bg-primary/10"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};