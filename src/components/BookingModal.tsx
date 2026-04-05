/**
 * BookingModal — thin wrapper that redirects to PurchasePage.
 *
 * The previous implementation had hardcoded seat data and a non-functional
 * "Confirm Booking" button. All real booking logic lives in PurchasePage
 * (payment, promo codes, fee calculation, Paystack redirect).
 *
 * This component is kept for call-site compatibility but delegates immediately.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface BookingModalProps {
  event: {
    eventKey?: string;
    id?: string;
  };
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

const BookingModal = ({ event, isOpen, onClose }: BookingModalProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const key = event.eventKey || event.id;
    if (key) {
      onClose?.();
      navigate(`/purchase/${key}`);
    }
  }, [isOpen, event.eventKey, event.id]);

  // Renders nothing — navigation happens in the effect above
  return null;
};

export default BookingModal;
