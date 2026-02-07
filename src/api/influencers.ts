import api, { mapFromApi, mapToApi } from '@/lib/api';
import { Influencer } from '@/types';

/** GET /influencers — list influencers (organizer) */
export const getInfluencers = async (): Promise<Influencer[]> => {
  try {
    const { data } = await api.get('/influencers');
    return mapFromApi<Influencer[]>(data?.influencers || data || []);
  } catch (error) {
    console.error('Error fetching influencers:', error);
    return [];
  }
};

/** POST /influencers — add influencer (organizer) */
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

/** DELETE /influencers/:id — remove influencer */
export const deleteInfluencer = async (id: string): Promise<void> => {
  await api.delete(`/influencers/${id}`);
};

/** GET /influencers/:id/referral-link */
export const getReferralLink = async (id: string): Promise<{ referralCode: string; referralLink: string }> => {
  const { data } = await api.get(`/influencers/${id}/referral-link`);
  return mapFromApi(data);
};
