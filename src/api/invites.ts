/**
 * API CLIENT - Invites
 *
 * Covers all invite-related endpoints:
 * - Organizer: set access mode, bulk upload, list, revoke
 * - Guest: redeem token
 * - Rewards: get unused reward
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';

export interface GuestEntry {
  name: string;
  email: string;
  ticket_type?: string;
}

export interface InviteResponse {
  id: string;
  email: string;
  name: string;
  ticketType: string;
  status: 'pending' | 'sent' | 'redeemed' | 'revoked' | 'expired';
  sentAt?: string;
  redeemedAt?: string;
  createdAt: string;
}

export interface BulkInviteResult {
  created: number;
  skipped: number;
  invalid: number;
  errors: string[];
}

export interface RedeemResponse {
  inviteId: string;
  eventId: string;
  ticketType: string;
  message: string;
}

export interface RewardRow {
  id: string;
  rewardType: 'ticket_discount' | 'event_credit' | 'both';
  discountPct: number;
  expiresAt: string;
}

/**
 * setAccessMode
 * Flips an event between 'public' and 'invite_only'.
 * Optionally sets an RSVP deadline (ISO 8601).
 */
export const setAccessMode = async (
  eventId: string,
  mode: 'public' | 'invite_only',
  rsvpDeadline?: string,
): Promise<void> => {
  await api.put(`/events/${eventId}/access-mode`, { access_mode: mode, rsvp_deadline: rsvpDeadline });
};

/**
 * bulkUploadGuests
 * Sends a JSON guest list to the backend.
 * For file uploads (CSV/DOCX/PDF) use bulkUploadFile instead.
 */
export const bulkUploadGuests = async (
  eventId: string,
  guests: GuestEntry[],
  rsvpDeadline?: string,
): Promise<BulkInviteResult> => {
  const { data } = await api.post(`/events/${eventId}/invites`, {
    guests,
    rsvp_deadline: rsvpDeadline,
  });
  return mapFromApi<BulkInviteResult>(data);
};

/**
 * bulkUploadFile
 * Uploads a CSV, JSON, DOCX, or PDF file as multipart/form-data.
 * Returns a summary of created/skipped/invalid rows.
 */
export const bulkUploadFile = async (
  eventId: string,
  file: File,
  rsvpDeadline?: string,
): Promise<BulkInviteResult> => {
  const form = new FormData();
  form.append('file', file);
  if (rsvpDeadline) form.append('rsvp_deadline', rsvpDeadline);

  const { data } = await api.post(`/events/${eventId}/invites/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return mapFromApi<BulkInviteResult>(data);
};

/**
 * listInvites
 * Returns all invites for an event (organizer only).
 */
export const listInvites = async (eventId: string): Promise<InviteResponse[]> => {
  const { data } = await api.get(`/events/${eventId}/invites`);
  const mapped = mapFromApi<{ invites: InviteResponse[] }>(data);
  return mapped.invites || [];
};

/**
 * revokeInvite
 * Revokes a single invite. Only works on pending/sent invites.
 */
export const revokeInvite = async (eventId: string, inviteId: string): Promise<void> => {
  await api.delete(`/events/${eventId}/invites/${inviteId}`);
};

/**
 * redeemToken
 * Called when a guest taps their invite link.
 * The token comes from the URL query param: /#/invite?token=...
 */
export const redeemToken = async (token: string): Promise<RedeemResponse> => {
  const { data } = await api.post('/invites/redeem', { token });
  return mapFromApi<RedeemResponse>(data);
};

/**
 * getUnusedReward
 * Returns the first unapplied referral reward for the current user, if any.
 * Called at checkout to show/apply the discount.
 */
export const getUnusedReward = async (): Promise<RewardRow | null> => {
  try {
    const { data } = await api.get('/invites/my-reward');
    return mapFromApi<RewardRow>(data);
  } catch {
    return null;
  }
};
