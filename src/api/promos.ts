import api, { mapFromApi, mapToApi } from '@/lib/api';
import { PromoCode } from '@/types';

/**
 * getEventPromos
 * High-level: Lists all promo codes created for a specific event.
 * Low-level: GETs /promos/event/:eventId and normalizes the response.
 * Returns [] on error so the promo management UI renders without crashing.
 */
export const getEventPromos = async (eventId: string): Promise<PromoCode[]> => {
  try {
    const { data } = await api.get(`/promos/event/${eventId}`);
    return mapFromApi<PromoCode[]>(data?.promos || data || []);
  } catch {
    return [];
  }
};

/**
 * createPromo
 * High-level: Creates a new discount promo code for an event.
 * Low-level: Converts the camelCase request to snake_case, POSTs to /promos,
 * and returns the created PromoCode. discountPercentage and ticketLimit
 * are enforced server-side — validate on the client too for UX.
 */
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

/**
 * deletePromo
 * High-level: Permanently deletes a promo code.
 * Low-level: Sends DELETE /promos/:id. Any in-flight uses of the code
 * may still succeed depending on backend transaction ordering.
 */
export const deletePromo = async (id: string): Promise<void> => {
  await api.delete(`/promos/${id}`);
};

/**
 * togglePromo
 * High-level: Flips a promo code between active and inactive without deleting it.
 * Low-level: Sends PATCH /promos/:id/toggle — no body needed, backend handles
 * the state flip and returns the updated PromoCode.
 */
export const togglePromo = async (id: string): Promise<PromoCode> => {
  const { data } = await api.patch(`/promos/${id}/toggle`);
  return mapFromApi<PromoCode>(data);
};

/**
 * validatePromo
 * High-level: Checks whether a promo code is valid and applicable for a given event.
 * Low-level: POSTs { event_id, code } to /promos/validate. Returns the PromoCode
 * (with discount info) on success, or null if invalid/expired/exhausted.
 */
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
