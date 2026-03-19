/**
 * API CLIENT - Organizer Credit Packs
 *
 * Organizers buy event credits instead of subscriptions.
 * Credits are valid for 12 months and consumed per event published.
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';

export type CreditPackType = 'single' | 'growth' | 'pro_pack' | 'annual';

export interface CreditPlan {
  packType: CreditPackType;
  label: string;
  price: number;
  creditsTotal: number;
  featuredIncluded: number;
  description: string;
}

// Static credit plan definitions (mirrors backend constants)
export const CREDIT_PLANS: CreditPlan[] = [
  {
    packType: 'single',
    label: 'Single Event',
    price: 2000,
    creditsTotal: 1,
    featuredIncluded: 0,
    description: 'Scanner + 3 influencer slots + basic analytics',
  },
  {
    packType: 'growth',
    label: 'Growth Pack',
    price: 5000,
    creditsTotal: 3,
    featuredIncluded: 0,
    description: '3 events · ₦1,667/event · same features as Single',
  },
  {
    packType: 'pro_pack',
    label: 'Pro Pack',
    price: 12000,
    creditsTotal: 10,
    featuredIncluded: 1,
    description: '10 events · ₦1,200/event · 1 featured listing included + priority support',
  },
  {
    packType: 'annual',
    label: 'Annual Unlimited',
    price: 25000,
    creditsTotal: -1,   // -1 = unlimited
    featuredIncluded: 3,
    description: 'Unlimited events/yr · 3 featured listings · everything included',
  },
];

export const getMyCredits = async () => {
  const { data } = await api.get('/credits/me');
  return mapFromApi(data);
};

export const purchaseCredits = async (packType: CreditPackType) => {
  const { data } = await api.post('/credits/purchase', mapToApi({ packType }));
  return mapFromApi(data);
};

export const applyCredit = async (eventId: string) => {
  const { data } = await api.post(`/credits/apply/${eventId}`);
  return mapFromApi(data);
};
