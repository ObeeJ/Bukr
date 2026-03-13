import api, { mapFromApi } from '@/lib/api';
import { EventAnalytics, DashboardSummary } from '@/types';

/**
 * getEventAnalytics
 * High-level: Loads performance metrics for a single event (sales, revenue, attendance).
 * Low-level: GETs /analytics/events/:eventId and maps the snake_case response
 * to a typed EventAnalytics object via mapFromApi.
 */
export const getEventAnalytics = async (eventId: string): Promise<EventAnalytics> => {
  const { data } = await api.get(`/analytics/events/${eventId}`);
  return mapFromApi<EventAnalytics>(data);
};

/**
 * getDashboardSummary
 * High-level: Loads the organizer's top-level dashboard numbers (total events, revenue, tickets sold).
 * Low-level: GETs /analytics/dashboard (auth-protected) and maps the response
 * to a typed DashboardSummary object. No params — backend scopes to the authed user.
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const { data } = await api.get('/analytics/dashboard');
  return mapFromApi<DashboardSummary>(data);
};
