export interface EventType {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  category: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  totalTickets: number;
  availableTickets: number;
  organizerId: string;
}