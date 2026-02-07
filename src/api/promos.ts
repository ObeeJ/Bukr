import api, { mapFromApi, mapToApi } from '@/lib/api';
import { PromoCode } from '@/types';

/** GET /promos/event/:eventId — list promo codes for an event */
export const getEventPromos = async (eventId: string): Promise<PromoCode[]> => {
  try {
    const { data } = await api.get(`/promos/event/${eventId}`);
    return mapFromApi<PromoCode[]>(data?.promos || data || []);
  } catch (error) {
    console.error('Error fetching promos:', error);
    return [];
  }
};

/** POST /promos — create a promo code */
export const createPromo = async (req: {
  eventId: string;
  code: string;
  discountPercentage: number;
  ticketLimit: number;
  expiresAt?: string;
}): Promise<PromoCode> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/promos', payload);
  return mapFromApi<PromoCode>(data);
};

/** DELETE /promos/:id */
export const deletePromo = async (id: string): Promise<void> => {
  await api.delete(`/promos/${id}`);
};

/** PATCH /promos/:id/toggle */
export const togglePromo = async (id: string): Promise<PromoCode> => {
  const { data } = await api.patch(`/promos/${id}/toggle`);
  return mapFromApi<PromoCode>(data);
};

/** POST /promos/validate — validate a promo code for an event */
export const validatePromo = async (eventId: string, code: string): Promise<PromoCode | null> => {
  try {
    const { data } = await api.post('/promos/validate', {
      event_id: eventId,
      code: code,
    });
    return mapFromApi<PromoCode>(data);
  } catch {
    return null;
  }
};
