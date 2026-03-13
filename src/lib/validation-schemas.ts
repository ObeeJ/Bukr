/**
 * DOMAIN LAYER - Zod Validation Schemas
 *
 * High-level: Client-side validation rules that mirror the backend’s business
 * rules. Running these before hitting the API gives instant feedback to the
 * user and prevents obviously bad requests from ever leaving the browser.
 *
 * Low-level: Each schema is a Zod object. The exported `*Input` types are
 * inferred directly from the schemas so form types and validation stay in sync
 * automatically — change the schema, the type updates for free.
 */
import { z } from 'zod';

/**
 * createEventSchema
 * High-level: Validates the create-event form before submission.
 * Low-level: Enforces field lengths, future-date constraint on `date`,
 * HH:MM format on `time`, and the cross-field rule that availableTickets
 * cannot exceed totalTickets.
 */
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

/**
 * purchaseTicketSchema
 * High-level: Validates the ticket purchase form before calling the purchase API.
 * Low-level: Enforces UUID format on eventId, quantity bounds (1–10 matching
 * backend rule), and restricts paymentProvider to known values.
 */
export const purchaseTicketSchema = z.object({
  eventId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
  ticketType: z.string().optional(),
  promoCode: z.string().optional(),
  paymentProvider: z.enum(['paystack', 'stripe']),
  excitementRating: z.number().int().min(1).max(5).optional(),
});

/**
 * createPromoSchema
 * High-level: Validates the promo code creation form.
 * Low-level: Enforces uppercase-alphanumeric-hyphen format on `code`,
 * 0–100 range on discount, and the cross-field rule that startDate < endDate.
 */
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

/**
 * updateProfileSchema
 * High-level: Validates the profile update form.
 * Low-level: Enforces name length, E.164-compatible phone regex, and
 * optional orgName length. All fields are optional so partial updates work.
 */
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
  orgName: z.string().min(2).max(200).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type PurchaseTicketInput = z.infer<typeof purchaseTicketSchema>;
export type CreatePromoInput = z.infer<typeof createPromoSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
