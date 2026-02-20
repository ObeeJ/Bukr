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

/** GET /users/me - Get current user profile */
export const getProfile = async (): Promise<User> => {
  const { data } = await api.get('/users/me');
  return mapFromApi<User>(data);
};

/** PATCH /users/me - Update profile */
export const updateProfile = async (updates: {
  name?: string;
  phone?: string;
  orgName?: string;
}): Promise<User> => {
  const payload = mapToApi(updates);
  const { data } = await api.patch('/users/me', payload);
  return mapFromApi<User>(data);
};

/** POST /users/me/complete - Complete profile after signup */
export const completeProfile = async (req: {
  name: string;
  userType: string;
  orgName?: string;
}): Promise<User> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/users/me/complete', payload);
  return mapFromApi<User>(data);
};

/** DELETE /users/me - Deactivate account */
export const deactivateAccount = async (): Promise<void> => {
  await api.delete('/users/me');
};
