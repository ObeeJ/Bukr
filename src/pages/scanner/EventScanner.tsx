import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode } from 'lucide-react';

export const EventScanner = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Scanner</CardTitle>
        <CardDescription>Scan tickets for event check-in</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>QR code scanner will be available here</p>
        </div>
      </CardContent>
    </Card>
  );
};