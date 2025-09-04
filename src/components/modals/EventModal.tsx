import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: any;
}

const EventModal = ({ isOpen, onClose, event }: EventModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event?.title || 'Event Details'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Event modal content will be displayed here</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;