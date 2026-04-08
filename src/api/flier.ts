import api from '@/lib/api';

export interface FlierExtractResult {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city: string;
  price: string;
  category: string;
}

// Returns true if the backend has OPENAI_API_KEY configured.
export async function isFlierExtractionEnabled(): Promise<boolean> {
  try {
    const { data } = await api.get('/events/extract-flier/status');
    return (data as { enabled: boolean }).enabled === true;
  } catch {
    return false;
  }
}

// Sends the uploaded flier URL to the backend AI extraction endpoint.
export async function extractFlier(flierUrl: string): Promise<FlierExtractResult> {
  const { data } = await api.post('/events/extract-flier', { flier_url: flierUrl });
  return data as FlierExtractResult;
}
