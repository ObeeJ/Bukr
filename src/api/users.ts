/**
 * API CLIENT - Users
 * 
 * Users API: HTTP client for user profile operations
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: API client (axios), type mappers
 * Responsibility: HTTP requests to users endpoints
 * 
 * Endpoints:
 * - GET /users/me: Get profile
 * - PATCH /users/me: Update profile
 * - POST /users/me/complete: Complete profile after signup
 */

import api, { mapFromApi, mapToApi } from '@/lib/api';
import { User } from '@/types';

/**
 * getProfile
 * High-level: Loads the full profile of the currently authenticated user.
 * Low-level: GETs /users/me (JWT-protected) and maps the response to a typed User.
 * Used on profile screens and to seed auth context on app load.
 */
export const getProfile = async (): Promise<User> => {
  const { data } = await api.get('/users/me');
  return mapFromApi<User>(data);
};

/**
 * updateProfile
 * High-level: Updates editable fields on the current user's profile.
 * Low-level: Converts the partial update to snake_case, PATCHes /users/me,
 * and returns the updated User. Only provided fields are changed.
 */
export const updateProfile = async (updates: {
  name?: string;
  phone?: string;
  orgName?: string;
}): Promise<User> => {
  const payload = mapToApi(updates);
  const { data } = await api.patch('/users/me', payload);
  return mapFromApi<User>(data);
};

/**
 * completeProfile
 * High-level: Finalizes a new user's profile after OAuth/email signup.
 * Low-level: POSTs required fields (name, userType, optional orgName) to
 * /users/me/complete. Must be called before the user can access protected features.
 */
export const completeProfile = async (req: {
  name: string;
  userType: string;
  orgName?: string;
}): Promise<User> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/users/me/complete', payload);
  return mapFromApi<User>(data);
};

/**
 * deactivateAccount
 * High-level: Soft-deletes or deactivates the current user's account.
 * Low-level: Sends DELETE /users/me with no body. The backend handles
 * cleanup (sessions, data retention). Irreversible from the client —
 * confirm with the user before calling.
 */
export const deactivateAccount = async (): Promise<void> => {
  await api.delete('/users/me');
};
