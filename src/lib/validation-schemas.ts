import { z } from 'zod';

// Event validation
export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  date: z.string().refine((date) => new Date(date) > new Date(), {
    message: 'Event date must be in the future',
  }),
  time: z.string().regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/),
  location: z.string().min(3).max(500),
  price: z.number().min(0).max(10000000),
  currency: z.enum(['NGN', 'USD', 'EUR', 'GBP']),
  totalTickets: z.number().int().min(1).max(100000),
  availableTickets: z.number().int().min(0),
  category: z.string().optional(),
}).refine((data) => data.availableTickets <= data.totalTickets, {
  message: 'Available tickets cannot exceed total tickets',
});

// Ticket purchase validation
export const purchaseTicketSchema = z.object({
  eventId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
  ticketType: z.string().optional(),
  promoCode: z.string().optional(),
  paymentProvider: z.enum(['paystack', 'stripe']),
  excitementRating: z.number().int().min(1).max(5).optional(),
});

// Promo code validation
export const createPromoSchema = z.object({
  eventId: z.string().uuid(),
  code: z.string().min(3).max(50).regex(/^[A-Z0-9-]+$/),
  discountPercentage: z.number().min(0).max(100),
  usageLimit: z.number().int().min(0).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: 'Start date must be before end date',
});

// User profile validation
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  orgName: z.string().min(2).max(200).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type PurchaseTicketInput = z.infer<typeof purchaseTicketSchema>;
export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
