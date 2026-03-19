/**
 * API CLIENT - Influencer Self-Service Portal
 *
 * Lets influencers view their referral stats, earnings, and request payouts.
 * Claim endpoint is public (token-based invite link from organizer).
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';

export interface PayoutRequest {
  amount: number;              // Minimum ₦5,000
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

export const getInfluencerProfile = async () => {
  const { data } = await api.get('/influencer/me');
  return mapFromApi(data);
};

export const getInfluencerLinks = async () => {
  const { data } = await api.get('/influencer/me/links');
  return mapFromApi(data);
};

export const requestPayout = async (req: PayoutRequest) => {
  const { data } = await api.post('/influencer/me/payout', mapToApi(req));
  return mapFromApi(data);
};

export const getPayoutHistory = async () => {
  const { data } = await api.get('/influencer/me/payouts');
  return mapFromApi(data);
};

/** Claim an organizer-generated influencer invite. User must be logged in. */
export const claimInfluencerToken = async (token: string) => {
  const { data } = await api.post(`/influencer/claim/${token}`);
  return mapFromApi(data);
};
