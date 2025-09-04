import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2 } from 'lucide-react';

const Promo = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Promotion</CardTitle>
        <CardDescription>Share and promote your event</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Event promotion tools will be available here</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default Promo;