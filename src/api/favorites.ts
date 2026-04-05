import api, { mapFromApi } from '@/lib/api';
import { FavoriteEvent } from '@/types';

/**
 * getFavorites
 * High-level: Loads all events the current user has bookmarked/favorited.
 * Low-level: GETs /favorites (JWT-scoped to the authed user). Handles both
 * { favorites: [] } and bare array responses. Returns [] on error.
 */
export const getFavorites = async (): Promise<FavoriteEvent[]> => {
  try {
    const { data } = await api.get('/favorites');
    // Go handler returns { events: [...] } — fall back to bare array for safety
    return mapFromApi<FavoriteEvent[]>(data?.events || data?.favorites || []);
  } catch {
    return [];
  }
};

/**
 * addFavorite
 * High-level: Bookmarks an event for the current user.
 * Low-level: POSTs to /favorites/:eventId with no body — the backend
 * derives the user from the JWT. Idempotent on most backends.
 */
export const addFavorite = async (eventId: string): Promise<void> => {
  await api.post(`/favorites/${eventId}`);
};

/**
 * removeFavorite
 * High-level: Removes an event from the user's bookmarks.
 * Low-level: Sends DELETE /favorites/:eventId. Safe to call even if
 * the event wasn't favorited — backend should return 200/204 either way.
 */
export const removeFavorite = async (eventId: string): Promise<void> => {
  await api.delete(`/favorites/${eventId}`);
};

/**
 * checkFavorite
 * High-level: Checks whether the current user has favorited a specific event.
 * Low-level: GETs /favorites/:eventId/check and reads the `favorited` boolean.
 * Returns false on any error so the heart icon defaults to un-filled safely.
 */
export const checkFavorite = async (eventId: string): Promise<boolean> => {
  try {
    const { data } = await api.get(`/favorites/${eventId}/check`);
    return data?.favorited || false;
  } catch {
    return false;
  }
};
