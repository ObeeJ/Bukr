// Event types
export interface Event {
  id: string | number;
  title: string;
  date: string;
  time: string;
  location: string;
  price: string;
  category: string;
  emoji: string;
  rating?: number;
  description?: string;
  totalTickets?: number;
  soldTickets?: number;
  revenue?: string;
  status?: 'active' | 'completed' | 'cancelled';
  image?: string;
  key?: string;
}

// Ticket types
export interface Ticket {
  id: string;
  ticketId: string;
  eventId: string;
  eventKey: string;
  userEmail: string;
  userName: string;
  ticketType: string;
  quantity: number;
  price: string;
  purchaseDate: string;
  status: 'valid' | 'used' | 'invalid';
  scanned?: boolean;
  scanDate?: string;
}

// Promo code types
export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  discountPercentage: number;
  ticketLimit: number;
  usedCount: number;
  isActive: boolean;
}

// Scan result types
export interface ScanResult {
  id: string;
  ticketId: string;
  eventId: string;
  userName: string;
  ticketType: string;
  timestamp: string;
  status: 'valid' | 'invalid' | 'used';
}

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  userType: 'user' | 'organizer';
  orgName?: string;
}

// Collaborator types
export interface Collaborator {
  id: string;
  name: string;
  email: string;
  accountNumber: string;
  bankName: string;
  ticketAllocation: number;
  discountPercentage: number;
  uniqueCode: string;
}