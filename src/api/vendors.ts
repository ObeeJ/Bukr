/**
 * API CLIENT - Vendor Marketplace
 *
 * Covers all vendor endpoints:
 * - Browse / search marketplace
 * - Vendor profile registration + updates
 * - AI matchmaking for events
 * - Hire request lifecycle (request → respond → complete)
 * - Reviews, availability calendar, invitations
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';

// ── TYPES ──────────────────────────────────────────────────────────────────

export interface VendorSearchParams {
  category?: string;
  city?: string;
  date?: string;        // ISO date YYYY-MM-DD — check availability on this day
  minRating?: number;
  tier?: string;        // 'free' | 'verified' | 'pro'
  page?: number;
  limit?: number;
}

export interface CreateVendorRequest {
  businessName: string;
  category: string;
  bio?: string;
  location: string;
  city: string;
  servesNationwide: boolean;
  portfolioUrls?: string[];
  commissionOnly: boolean;  // true = free tier (8% commission), false = paid tier
}

export interface HireRequest {
  vendorId: string;
  eventId: string;
  proposedAmount?: number;
  message?: string;
}

export interface HireRespondRequest {
  accept: boolean;
  counterAmount?: number;
}

export interface ReviewRequest {
  hireId: string;
  rating: number;   // 1–5
  review?: string;
}

export interface AvailabilitySetRequest {
  dates: string[];   // ISO date strings YYYY-MM-DD
  isBooked: boolean;
}

// ── MARKETPLACE ────────────────────────────────────────────────────────────

export const searchVendors = async (params: VendorSearchParams = {}) => {
  const { data } = await api.get('/vendors', { params: mapToApi(params) });
  return mapFromApi(data);
};

export const getVendor = async (id: string) => {
  const { data } = await api.get(`/vendors/${id}`);
  return mapFromApi(data);
};

export const registerVendor = async (req: CreateVendorRequest) => {
  const { data } = await api.post('/vendors', mapToApi(req));
  return mapFromApi(data);
};

// ── AI MATCHMAKING ─────────────────────────────────────────────────────────

export const matchVendors = async (eventId: string) => {
  const { data } = await api.get('/vendors/match', { params: { event_id: eventId } });
  return mapFromApi(data);
};

// ── AVAILABILITY ────────────────────────────────────────────────────────────

export const setAvailability = async (req: AvailabilitySetRequest) => {
  const { data } = await api.post('/vendors/availability', mapToApi(req));
  return mapFromApi(data);
};

// ── HIRE LIFECYCLE ──────────────────────────────────────────────────────────

export const requestHire = async (req: HireRequest) => {
  const { data } = await api.post('/vendor-hires', mapToApi(req));
  return mapFromApi(data);
};

export const respondHire = async (hireId: string, req: HireRespondRequest) => {
  const { data } = await api.post(`/vendor-hires/${hireId}/respond`, mapToApi(req));
  return mapFromApi(data);
};

export const completeHire = async (hireId: string, agreedAmount: number) => {
  const { data } = await api.post(`/vendor-hires/${hireId}/complete`, { agreed_amount: agreedAmount });
  return mapFromApi(data);
};

export const getMyVendorHires = async () => {
  const { data } = await api.get('/vendor/me/hires');
  return mapFromApi(data);
};

// ── REVIEWS ─────────────────────────────────────────────────────────────────

export const submitReview = async (req: ReviewRequest) => {
  const { data } = await api.post('/vendor-reviews', mapToApi(req));
  return mapFromApi(data);
};

// ── INVITATIONS ──────────────────────────────────────────────────────────────

export const sendVendorInvitation = async (email: string, eventId?: string, message?: string) => {
  const { data } = await api.post('/vendor-invitations', mapToApi({ email, eventId, message }));
  return mapFromApi(data);
};

export const claimInvitation = async (token: string) => {
  const { data } = await api.get(`/vendor-invitations/claim/${token}`);
  return mapFromApi(data);
};
