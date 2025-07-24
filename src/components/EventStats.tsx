import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTicket } from '@/contexts/TicketContext';

interface EventStatsProps {
  eventId: string;
  eventKey: string;
  totalTickets: number;
}

const EventStats: React.FC<EventStatsProps> = ({ eventId, eventKey, totalTickets }) => {
  const { getEventTickets } = useTicket();
  
  // Get tickets for this event
  const tickets = getEventTickets(eventId);
  
  // Calculate stats with real-time updates
  const eventTickets = tickets.filter(t => t.eventKey === eventKey);
  const sold = eventTickets.length;
  const used = eventTickets.filter(t => t.status === 'used').length;
  const remaining = Math.max(0, totalTickets - sold);
  const unused = sold - used;
  
  // Data for sales pie chart
  const salesData = [
    { name: 'Sold', value: sold, color: '#4f46e5' },
    { name: 'Available', value: remaining, color: '#e5e7eb' }
  ].filter(item => item.value > 0);
  
  // Data for usage pie chart
  const usageData = [
    { name: 'Used', value: used, color: '#10b981' },
    { name: 'Unused', value: unused, color: '#f59e0b' }
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Ticket Sales</CardTitle>
          <CardDescription className="text-sm">Sold vs. Available Tickets</CardDescription>
        </CardHeader>
        <CardContent>
          {salesData.length > 0 ? (
            <>
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {salesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Sold</p>
                  <p className="text-lg sm:text-2xl font-bold text-primary">{sold}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">Available</p>
                  <p className="text-lg sm:text-2xl font-bold text-muted">{remaining}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
              No ticket data available
            </div>
          )}
        </CardContent>
      </Card>
      
      {sold > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Ticket Usage</CardTitle>
            <CardDescription className="text-sm">Used vs. Unused Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {usageData.length > 0 ? (
              <>
                <div className="h-48 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={usageData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {usageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Used</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-500">{used}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs sm:text-sm text-muted-foreground">Unused</p>
                    <p className="text-lg sm:text-2xl font-bold text-amber-500">{unused}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground">
                No usage data available
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventStats;