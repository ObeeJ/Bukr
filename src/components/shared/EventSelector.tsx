import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EventSelectorProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EventSelector = ({ open, setOpen }: EventSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Event selector will be displayed here</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};