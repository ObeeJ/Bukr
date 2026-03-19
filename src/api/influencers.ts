import api, { mapFromApi, mapToApi } from '@/lib/api';
import { Influencer } from '@/types';

/**
 * getInfluencers
 * High-level: Lists all influencers registered under the organizer's account.
 * Low-level: GETs /influencers and normalizes the response (handles both
 * { influencers: [] } and bare array). Returns [] on error.
 */
export const getInfluencers = async (): Promise<Influencer[]> => {
  try {
    const { data } = await api.get('/influencers');
    return mapFromApi<Influencer[]>(data?.influencers || data || []);
  } catch {
    return [];
  }
};

/**
 * getInfluencerById
 * High-level: Fetches a single influencer's full profile by ID.
 * Low-level: GETs /influencers/:id and maps the response to a typed Influencer.
 * Throws on 404 — caller should handle not-found cases.
 */
export const getInfluencerById = async (id: string): Promise<Influencer> => {
  const { data } = await api.get(`/influencers/${id}`);
  return mapFromApi<Influencer>(data);
};

/**
 * createInfluencer
 * High-level: Registers a new influencer and links them to the organizer's account.
 * Low-level: Converts the camelCase request to snake_case via mapToApi,
 * POSTs to /influencers, and returns the created Influencer record.
 */
export const createInfluencer = async (req: {
  name: string;
  email: string;
  socialHandle: string;
  bio: string;
}): Promise<Influencer> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/influencers', payload);
  return mapFromApi<Influencer>(data);
};

/**
 * updateInfluencer
 * High-level: Updates an influencer's profile details or active status.
 * Low-level: PUTs the partial payload (snake_case converted) to /influencers/:id.
 * All fields are optional — only provided fields are updated.
 */
export const updateInfluencer = async (id: string, req: {
  name?: string;
  email?: string;
  socialHandle?: string;
  bio?: string;
  isActive?: boolean;
}): Promise<Influencer> => {
  const payload = mapToApi(req);
  const { data } = await api.put(`/influencers/${id}`, payload);
  return mapFromApi<Influencer>(data);
};

/**
 * deleteInfluencer
 * High-level: Permanently removes an influencer from the system.
 * Low-level: Sends DELETE /influencers/:id. Their referral links will stop working
 * after this call — confirm before calling.
 */
export const deleteInfluencer = async (id: string): Promise<void> => {
  await api.delete(`/influencers/${id}`);
};

/**
 * getReferralLink
 * High-level: Retrieves the unique referral code and shareable link for an influencer.
 * Low-level: GETs /influencers/:id/referral-link and maps the response.
 * The referral link embeds the code so ticket purchases can be attributed.
 */
export const getReferralLink = async (id: string): Promise<{ referralCode: string; referralLink: string }> => {
  const { data } = await api.get(`/influencers/${id}/referral-link`);
  return mapFromApi(data);
};
