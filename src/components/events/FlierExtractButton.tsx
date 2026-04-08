import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { extractFlier, isFlierExtractionEnabled, FlierExtractResult } from '@/api/flier';
import { toast } from 'sonner';

interface FlierExtractButtonProps {
  flierUrl: string;
  onExtracted: (result: FlierExtractResult) => void;
}

// Checks on mount whether the backend has AI extraction configured.
// Renders nothing if the feature is disabled — no confusing broken button.
const FlierExtractButton = ({ flierUrl, onExtracted }: FlierExtractButtonProps) => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    isFlierExtractionEnabled().then(setEnabled);
  }, []);

  // Still checking, or feature is off — render nothing
  if (!enabled) return null;

  const handleExtract = async () => {
    setLoading(true);
    try {
      const result = await extractFlier(flierUrl);
      onExtracted(result);
      toast.success('Flier scanned!', { description: 'Form fields filled from your flier.' });
    } catch {
      toast.error('Could not read flier', { description: 'Try filling the fields manually.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExtract}
      disabled={loading}
      className="mt-2 w-full border-primary/40 text-primary hover:bg-primary/10"
    >
      {loading ? (
        <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Scanning flier...</>
      ) : (
        <><Sparkles className="mr-2 h-3.5 w-3.5" />Auto-fill from flier</>
      )}
    </Button>
  );
};

export default FlierExtractButton;
