import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any;
}

export const EventModal = ({ open, onClose, onSuccess, initialData }: EventModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData?.title || 'Event Details'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>Event modal content will be displayed here</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};