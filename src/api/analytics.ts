import api, { mapFromApi } from '@/lib/api';
import { EventAnalytics, DashboardSummary } from '@/types';

/** GET /analytics/events/:eventId — analytics for a single event */
export const getEventAnalytics = async (eventId: string): Promise<EventAnalytics> => {
  const { data } = await api.get(`/analytics/events/${eventId}`);
  return mapFromApi<EventAnalytics>(data);
};

/** GET /analytics/dashboard — dashboard summary for organizer */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await api.get('/analytics/dashboard');
  return mapFromApi<DashboardSummary>(data);
};
