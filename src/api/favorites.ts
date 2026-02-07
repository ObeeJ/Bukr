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

/** POST /favorites — add event to favorites */
export const addFavorite = async (eventId: string): Promise<void> => {
  await api.post('/favorites', { event_id: eventId });
};

/** DELETE /favorites/:eventId — remove from favorites */
export const removeFavorite = async (eventId: string): Promise<void> => {
  await api.delete(`/favorites/${eventId}`);
};

/** GET /favorites/check/:eventId — check if event is favorited */
export const checkFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const { data } = await api.get(`/favorites/check/${eventId}`);
    return data?.favorited || false;
  } catch {
    return false;
  }
};
