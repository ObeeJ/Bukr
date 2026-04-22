import { useQuery } from '@tanstack/react-query';
import { getAllEvents, getMyEvents } from '@/api/events';
import { getMyTickets } from '@/api/tickets';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const [events, tickets] = await Promise.all([
        getMyEvents({ limit: 100 }),
        getMyTickets(),
      ]);
      
      const totalRevenue = tickets.reduce((acc, t) => acc + Number(t.totalPrice), 0);
      return {
        totalEvents: events.length,
        totalAttendees: tickets.length,
        totalRevenue,
        activeEvents: events.filter(e => e.status === 'active').length
      };
    }
  });
};
