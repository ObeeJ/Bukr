import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/contexts/EventContext';
import { useTicket } from '@/contexts/TicketContext';
import TicketScanner from '@/components/TicketScanner';
import AnimatedLogo from '@/components/AnimatedLogo';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Check, X, AlertCircle } from 'lucide-react';

const ScannerPage = () => {
  const { eventId, eventKey } = useParams();
  const navigate = useNavigate();
  const { getEvent } = useEvent();
  const { validateTicket, markTicketAsUsed } = useTicket();
  const [status, setStatus] = useState<'valid' | 'invalid' | 'used' | null>(null);
  const [scanCount, setScanCount] = useState({ valid: 0, invalid: 0, used: 0 });
  const [currentEvent, setCurrentEvent] = useState<{
    id?: string;
    title?: string;
    key?: string;
  } | null>(null);

  useEffect(() => {
    // Verify that the event exists
    if (eventId) {
      const event = getEvent(eventId);
      if (!event) {
        navigate('/');
      } else {
        setCurrentEvent(event);
      }
    } else if (eventKey) {
      // If we have eventKey but no eventId, try to find the event by key
      const events = getEvent('all');
      const event = Array.isArray(events) ? events.find(e => e.key === eventKey) : null;
      if (!event) {
        navigate('/');
      } else {
        setCurrentEvent(event);
      }
    } else {
      navigate('/');
    }
  }, [eventId, eventKey, getEvent, navigate]);

  const handleScan = (code: string) => {
    try {
      const data = JSON.parse(code);
      
      if (!currentEvent) {
        setStatus('invalid');
        setScanCount(prev => ({ ...prev, invalid: prev.invalid + 1 }));
        return;
      }
      
      const result = validateTicket(data.ticketId, data.eventKey);
      
      if (!result.isValid) {
        if (result.ticket?.status === 'used') {
          setStatus('used');
          setScanCount(prev => ({ ...prev, used: prev.used + 1 }));
        } else {
          setStatus('invalid');
          setScanCount(prev => ({ ...prev, invalid: prev.invalid + 1 }));
        }
        return;
      }
      
      // Mark ticket as used
      markTicketAsUsed(data.ticketId);
      setStatus('valid');
      setScanCount(prev => ({ ...prev, valid: prev.valid + 1 }));
    } catch (error) {
      setStatus('invalid');
      setScanCount(prev => ({ ...prev, invalid: prev.invalid + 1 }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Ticket Scanner</h1>
          <p className="text-muted-foreground">
            {currentEvent ? `Scan tickets for ${currentEvent.title}` : 'Loading event...'}
          </p>
        </div>
        
        <div className="flex gap-2 mt-4 md:mt-0">
          <Badge variant="outline" className="bg-green-100 text-green-800">
            Valid: {scanCount.valid}
          </Badge>
          <Badge variant="outline" className="bg-amber-100 text-amber-800">
            Used: {scanCount.used}
          </Badge>
          <Badge variant="outline" className="bg-red-100 text-red-800">
            Invalid: {scanCount.invalid}
          </Badge>
        </div>
      </div>

      {status && (
        <Alert 
          className={
            status === 'valid' ? 'bg-green-100 text-green-800 border-green-200 mb-4' : 
            status === 'used' ? 'bg-amber-100 text-amber-800 border-amber-200 mb-4' : 
            'bg-red-100 text-red-800 border-red-200 mb-4'
          }
        >
          {status === 'valid' && <Check className="h-4 w-4" />}
          {status === 'used' && <AlertCircle className="h-4 w-4" />}
          {status === 'invalid' && <X className="h-4 w-4" />}
          <AlertTitle>
            {status === 'valid' ? 'Valid Ticket' : 
             status === 'used' ? 'Already Used' : 'Invalid Ticket'}
          </AlertTitle>
          <AlertDescription>
            {status === 'valid' ? 'Ticket has been validated and marked as used.' : 
             status === 'used' ? 'This ticket has already been scanned.' : 
             'This ticket is not valid for this event.'}
          </AlertDescription>
        </Alert>
      )}

      <TicketScanner onScan={handleScan} />
    </div>
  );
};

export default ScannerPage;