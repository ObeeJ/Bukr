import api, { mapFromApi, mapToApi } from '@/lib/api';
import { User } from '@/types';

/** GET /users/me — get current user profile */
export const getProfile = async (): Promise<User> => {
  const { data } = await api.get('/users/me');
  return mapFromApi<User>(data);
};

/** PATCH /users/me — update profile */
export const updateProfile = async (updates: {
  name?: string;
  phone?: string;
  orgName?: string;
}): Promise<User> => {
  const payload = mapToApi(updates);
  const { data } = await api.patch('/users/me', payload);
  return mapFromApi<User>(data);
};

/** POST /users/me/complete — complete profile after signup */
export const completeProfile = async (req: {
  name: string;
  userType: string;
  orgName?: string;
}): Promise<User> => {
  const payload = mapToApi(req);
  const { data } = await api.post('/users/me/complete', payload);
  return mapFromApi<User>(data);
};
