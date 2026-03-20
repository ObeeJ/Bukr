import api, { mapFromApi, mapToApi } from '@/lib/api';
import { AppNotification, NotificationPreferences } from '@/types';

export const fetchNotifications = async (): Promise<AppNotification[]> => {
  const { data } = await api.get('/notifications');
  return mapFromApi<AppNotification[]>(data ?? []);
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notifications/${id}/read`);
};

export const markAllRead = async (): Promise<void> => {
  await api.patch('/notifications/read-all');
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const { data } = await api.get('/notifications/preferences');
  return mapFromApi<NotificationPreferences>(data);
};

export const updateNotificationPreferences = async (
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const { data } = await api.patch('/notifications/preferences', mapToApi(prefs));
  return mapFromApi<NotificationPreferences>(data);
};
