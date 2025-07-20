import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react';
import { Ticket } from '@/contexts/TicketContext';
import QRCode from 'react-qr-code';

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const qrValue = JSON.stringify({
    ticketId: ticket.ticketId,
    eventKey: ticket.eventKey,
    userEmail: ticket.userEmail
  });

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Ticket for ${ticket.eventId}`,
        text: `My ticket for ${ticket.eventId}`,
        url: window.location.href,
      });
    } else {
      alert(`Sharing ticket: ${ticket.ticketId}`);
    }
  };

  const handleDownload = () => {
    // In a real app, this would generate and download a PDF ticket
    alert(`Downloading ticket: ${ticket.ticketId}`);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{ticket.eventId}</CardTitle>
        <CardDescription>{new Date(ticket.purchaseDate).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-xl mb-4">
          <QRCode 
            value={qrValue}
            size={200}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
          <div className="text-center mt-2">
            <p className="text-sm text-black font-mono">{ticket.ticketId}</p>
          </div>
        </div>
        <div className="w-full space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Name:</span>
            <span className="font-medium">{ticket.userName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Type:</span>
            <span className="font-medium">{ticket.ticketType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Quantity:</span>
            <span className="font-medium">{ticket.quantity}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Price:</span>
            <span className="font-medium">{ticket.price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className={`font-medium ${
              ticket.status === 'valid' ? 'text-green-500' : 
              ticket.status === 'used' ? 'text-amber-500' : 'text-red-500'
            }`}>
              {ticket.status.toUpperCase()}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" className="logo font-medium" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        <Button variant="glow" className="logo font-medium" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TicketCard;