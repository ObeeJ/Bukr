import React from 'react';

interface EmptyProps {
  message?: string;
}

export const Empty = ({ message = "No items found" }: EmptyProps) => {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>{message}</p>
    </div>
  );
};