import api, { mapFromApi } from '@/lib/api';
import { FavoriteEvent } from '@/types';

/** GET /favorites — user's favorite events */
export const getFavorites = async (): Promise<FavoriteEvent[]> => {
  try {
    const { data } = await api.get('/favorites');
    return mapFromApi<FavoriteEvent[]>(data?.favorites || data || []);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }
};

/** POST /favorites/:eventId — add event to favorites */
export const addFavorite = async (eventId: string): Promise<void> => {
  await api.post(`/favorites/${eventId}`);
};

/** DELETE /favorites/:eventId — remove from favorites */
export const removeFavorite = async (eventId: string): Promise<void> => {
  await api.delete(`/favorites/${eventId}`);
};

/** GET /favorites/:eventId/check — check if event is favorited */
export const checkFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const { data } = await api.get(`/favorites/${eventId}/check`);
    return data?.favorited || false;
  } catch {
    return false;
  }
};
