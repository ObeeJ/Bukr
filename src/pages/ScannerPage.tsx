import React from 'react';
import { useParams } from 'react-router-dom';
import TicketScanner from '@/components/TicketScanner';
import AnimatedLogo from '@/components/AnimatedLogo';

const ScannerPage = () => {
  const { eventId } = useParams();

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AnimatedLogo size="sm" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Ticket Scanner</h1>
          <p className="text-muted-foreground">Scan tickets for event #{eventId}</p>
        </div>
      </div>

      <TicketScanner />
    </div>
  );
};

export default ScannerPage;