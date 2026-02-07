// =====================
// User Types
// =====================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  userType: "user" | "organizer";
  orgName?: string;
  avatarUrl?: string;
  createdAt?: string;
}

// =====================
// Event Types
// =====================

export interface Event {
  id: string;
  organizerId?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  endDate?: string;
  location: string;
  price?: number;
  currency?: string;
  category?: string;
  emoji?: string;
  eventKey?: string;
  status?: string;
  totalTickets: number;
  availableTickets?: number;
  soldTickets?: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  flierUrl?: string;
  isFeatured?: boolean;
  organizer?: {
    id: string;
    name: string;
    orgName?: string;
  };
  createdAt?: string;
  // Kept for backward compatibility with existing components
  name?: string;
  image?: string;
  scannedTickets?: number;
  revenue?: number | string;
  ticketTypes?: TicketType[];
  allowShare?: boolean;
}

// Also export as EventType for components that import it by that name
export type EventType = Event;

export interface EventListResponse {
  events: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =====================
// Ticket Types
// =====================

export interface Ticket {
  id?: string;
  ticketId: string;
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  eventKey?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  ticketType: string;
  quantity: number;
  unitPrice?: number;
  discountApplied?: number;
  totalPrice?: number;
  price?: string; // Formatted price string for display
  currency?: string;
  status: 'valid' | 'used' | 'expired' | 'pending' | 'cancelled';
  qrCodeData?: string;
  paymentRef?: string;
  excitementRating?: number;
  purchaseDate: string;
}

export interface PurchaseTicketRequest {
  eventId: string;
  quantity: number;
  ticketType?: string;
  promoCode?: string;
  excitementRating?: number;
  paymentProvider: string;
  referralCode?: string;
}

export interface PurchaseResponse {
  ticket: Ticket;
  payment: {
    provider: string;
    authorizationUrl?: string;
    checkoutUrl?: string;
    reference: string;
    amount: number;
    currency: string;
  };
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  hasSeating?: boolean;
  seatingConfig?: SeatingConfig;
}

// =====================
// Promo Types
// =====================

export interface PromoCode {
  id: string;
  eventId: string;
  code: string;
  discountPercentage: number;
  usedCount: number;
  ticketLimit: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt?: string;
}

// =====================
// Favorite Types
// =====================

export interface FavoriteEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  price: number;
  currency: string;
  category: string;
  emoji?: string;
  eventKey: string;
  thumbnailUrl?: string;
  availableTickets: number;
  organizerName: string;
}

// =====================
// Influencer Types
// =====================

export interface Influencer {
  id: string;
  name: string;
  email: string;
  socialHandle: string;
  bio: string;
  referralCode: string;
  referralDiscount: number;
  totalReferrals: number;
  totalRevenue: number;
  isActive: boolean;
  createdAt?: string;
}

// =====================
// Scanner Types
// =====================

export interface ScanValidationResult {
  isValid: boolean;
  status: 'valid' | 'used' | 'invalid';
  message: string;
  ticket?: Ticket;
}

export interface ScannerStats {
  totalTickets: number;
  scannedTickets: number;
  remainingTickets: number;
}

// =====================
// Analytics Types
// =====================

export interface EventAnalytics {
  eventId: string;
  totalTickets: number;
  soldTickets: number;
  usedTickets: number;
  revenue: number;
  currency: string;
}

export interface DashboardSummary {
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
}

// =====================
// Seating Types
// =====================

export interface Seat {
  id: string;
  label: string;
  status: 'available' | 'booked' | 'selected' | 'reserved';
  type: 'regular' | 'vip';
}

export interface SeatingConfig {
  layoutType: 'grid' | 'tables';
  rows?: number;
  cols?: number;
  tableCount?: number;
  seatsPerTable?: number;
}

// =====================
// API Response Types
// =====================

export interface APIResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}
