import React from 'react';

interface EmptyProps {
  message?: string;
}

export const Empty = ({ message = "No items found" }: EmptyProps) => {
  return (
    <div className="text-center py-8 sm:py-12 px-4">
      <div className="glass-card p-6 sm:p-8 max-w-md mx-auto">
        <div className="text-4xl sm:text-5xl mb-4 opacity-50">💭</div>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">{message}</p>
      </div>
    </div>
  );
};