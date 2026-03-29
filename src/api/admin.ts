/**
 * API CLIENT - Admin Dashboard
 *
 * Internal-only endpoints. All require user_type = 'admin'.
 * Served directly from Go gateway (not proxied to Rust).
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';

// ── OVERVIEW ───────────────────────────────────────────────────────────────

export const getAdminOverview = async () => {
  const { data } = await api.get('/admin/overview');
  return mapFromApi(data);
};

// ── USERS ──────────────────────────────────────────────────────────────────

export interface UserListParams {
  userType?: string;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const listUsers = async (params: UserListParams = {}) => {
  const { data } = await api.get('/admin/users', { params: mapToApi(params) });
  return mapFromApi(data);
};

export const updateUser = async (userId: string, updates: Record<string, unknown>) => {
  const { data } = await api.patch(`/admin/users/${userId}`, mapToApi(updates));
  return mapFromApi(data);
};

// ── EVENTS ─────────────────────────────────────────────────────────────────

export interface AdminEventParams {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  organizerId?: string;
  page?: number;
  limit?: number;
}

export const listAdminEvents = async (params: AdminEventParams = {}) => {
  const { data } = await api.get('/admin/events', { params: mapToApi(params) });
  return mapFromApi(data);
};

export const updateAdminEvent = async (eventId: string, updates: Record<string, unknown>) => {
  const { data } = await api.patch(`/admin/events/${eventId}`, mapToApi(updates));
  return mapFromApi(data);
};

// ── TICKETS ─────────────────────────────────────────────────────────────────

export interface AdminTicketParams {
  status?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export const listAdminTickets = async (params: AdminTicketParams = {}) => {
  const { data } = await api.get('/admin/tickets', { params: mapToApi(params) });
  return mapFromApi(data);
};

// ── FINANCE ─────────────────────────────────────────────────────────────────

export interface RevenueParams {
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  organizerId?: string;
  page?: number;
  limit?: number;
}

export const getFinanceSummary = async () => {
  const { data } = await api.get('/admin/finance');
  return mapFromApi(data);
};

export const getRevenueStream = async (params: RevenueParams = {}) => {
  const { data } = await api.get('/admin/finance/revenue', { params: mapToApi(params) });
  return mapFromApi(data);
};

// ── VENDORS ─────────────────────────────────────────────────────────────────

export const listAdminVendors = async (params: Record<string, unknown> = {}) => {
  const { data } = await api.get('/admin/vendors', { params: mapToApi(params) });
  return mapFromApi(data);
};

export const updateAdminVendor = async (vendorId: string, updates: Record<string, unknown>) => {
  const { data } = await api.patch(`/admin/vendors/${vendorId}`, mapToApi(updates));
  return mapFromApi(data);
};

// ── INFLUENCERS ─────────────────────────────────────────────────────────────

export const listAdminInfluencers = async (params: Record<string, unknown> = {}) => {
  const { data } = await api.get('/admin/influencers', { params: mapToApi(params) });
  return mapFromApi(data);
};

export const approvePayout = async (payoutId: string) => {
  const { data } = await api.post(`/admin/payouts/${payoutId}/approve`);
  return mapFromApi(data);
};

export const rejectPayout = async (payoutId: string, note: string) => {
  const { data } = await api.post(`/admin/payouts/${payoutId}/reject`, { note });
  return mapFromApi(data);
};

// ── SYSTEM ───────────────────────────────────────────────────────────────────

export const getFeatureFlags = async () => {
  const { data } = await api.get('/admin/system/flags');
  return mapFromApi(data);
};

export const updateFeatureFlags = async (flags: Record<string, unknown>) => {
  const { data } = await api.patch('/admin/system/flags', flags);
  return mapFromApi(data);
};

export const getSystemLogs = async (params: { page?: number; limit?: number } = {}) => {
  const { data } = await api.get('/admin/system/logs', { params });
  return mapFromApi(data);
};

// ── AUDIT LOG ────────────────────────────────────────────────────────────────

export interface AuditLogParams {
  adminId?: string;
  entityType?: string;
  action?: string;
  page?: number;
  limit?: number;
}

export const getAuditLog = async (params: AuditLogParams = {}) => {
  const { data } = await api.get('/admin/audit-log', { params: mapToApi(params) });
  return mapFromApi(data);
};

// ── PAYMENTS ─────────────────────────────────────────────────────────────────

export interface PaymentParams {
  status?: string;
  page?: number;
  limit?: number;
}

export const listPayments = async (params: PaymentParams = {}) => {
  const { data } = await api.get('/admin/payments', { params: mapToApi(params) });
  return mapFromApi(data);
};

// ── DISPUTES ─────────────────────────────────────────────────────────────────

export const listDisputes = async (params: { page?: number; limit?: number } = {}) => {
  const { data } = await api.get('/admin/disputes', { params });
  return mapFromApi(data);
};

export const resolveDispute = async (id: string, body: { resolution: string; finalAmount?: number; note?: string }) => {
  const { data } = await api.patch(`/admin/disputes/${id}/resolve`, mapToApi(body));
  return mapFromApi(data);
};

// ── ORGANIZERS ───────────────────────────────────────────────────────────────

export const listOrganizers = async (params: { page?: number; limit?: number } = {}) => {
  const { data } = await api.get('/admin/organizers', { params });
  return mapFromApi(data);
};
