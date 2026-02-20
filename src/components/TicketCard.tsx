// ============================================================================
// TICKET CARD - DIGITAL TICKET DISPLAY
// ============================================================================
// Layer 1: PRESENTATION - Ticket visualization component
//
// ARCHITECTURE ROLE:
// - Displays purchased ticket with QR code
// - Provides share and download functionality
// - Shows ticket status (valid, used, expired)
// - Scannable at event entrance
//
// REACT PATTERNS:
// 1. QR Code Generation: Uses react-qr-code library
// 2. Web Share API: Native sharing on mobile devices
// 3. Conditional Styling: Color-coded status indicators
// 4. Component Composition: Card components from shadcn/ui
//
// QR CODE DATA:
// - Contains: ticketId, eventKey, userEmail
// - JSON stringified for easy parsing by scanner
// - Unique per ticket (prevents duplication)
//
// TICKET STATUS:
// - valid: Green - Can be used for entry
// - used: Amber - Already scanned, cannot reuse
// - expired: Red - Event has passed
//
// SHARING FUNCTIONALITY:
// - Uses Web Share API (mobile native sharing)
// - Fallback to alert (desktop or unsupported browsers)
// - In production, would generate shareable link
//
// DOWNLOAD FUNCTIONALITY:
// - Currently shows alert (placeholder)
// - In production, would generate PDF ticket
// - PDF would include QR code, event details, terms
//
// SECURITY CONSIDERATIONS:
// - QR code should be encrypted in production
// - Ticket should have expiration timestamp
// - Scanner should validate against backend
// - Prevent screenshot sharing (watermark user email)
// ============================================================================

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
  // QR CODE DATA - JSON stringified for scanner
  // Scanner will parse this JSON and validate against backend
  const qrValue = JSON.stringify({
    ticketId: ticket.ticketId,
    eventKey: ticket.eventKey,
    userEmail: ticket.userEmail
  });

  // SHARE HANDLER - Uses Web Share API
  const handleShare = () => {
    if (navigator.share) {
      // Web Share API available (mobile browsers)
      navigator.share({
        title: `Ticket for ${ticket.eventId}`,
        text: `My ticket for ${ticket.eventId}`,
        url: window.location.href,
      });
    } else {
      // Fallback for desktop or unsupported browsers
      alert(`Sharing ticket: ${ticket.ticketId}`);
      // In production, copy link to clipboard or show share modal
    }
  };

  // DOWNLOAD HANDLER - PDF generation placeholder
  const handleDownload = () => {
    // In production, this would:
    // 1. Call API to generate PDF ticket
    // 2. Download PDF with QR code, event details, terms
    // 3. Include watermark with user email (prevent sharing)
    alert(`Downloading ticket: ${ticket.ticketId}`);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{ticket.eventId}</CardTitle>
        <CardDescription>{new Date(ticket.purchaseDate).toLocaleDateString()}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {/* QR CODE - The star of the show */}
        {/* White background ensures scanability (QR codes need contrast) */}
        <div className="bg-white p-4 rounded-xl mb-4">
          {/* JSON string with ticket data */}
          {/* 200x200px - good balance of size and scanability */}
          {/* SVG viewBox for scaling */}
          <QRCode 
            value={qrValue}
            size={200}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
          {/* TICKET ID - Human-readable identifier */}
          <div className="text-center mt-2">
            <p className="text-sm text-black font-mono">{ticket.ticketId}</p>
          </div>
        </div>
        
        {/* TICKET DETAILS - Key information */}
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
          {/* STATUS - Color-coded for quick recognition */}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <span className={`font-medium ${
              ticket.status === 'valid' ? 'text-green-500' :      // Green: Good to go
              ticket.status === 'used' ? 'text-amber-500' :       // Amber: Already used
              'text-red-500'                                       // Red: Expired/invalid
            }`}>
              {ticket.status.toUpperCase()}
            </span>
          </div>
        </div>
      </CardContent>
      
      {/* ACTIONS - Share and download */}
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