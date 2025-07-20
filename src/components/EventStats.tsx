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
  
  // Calculate stats
  const sold = tickets.filter(t => t.eventKey === eventKey).length;
  const used = tickets.filter(t => t.eventKey === eventKey && t.status === 'used').length;
  const remaining = totalTickets - sold;
  
  // Data for pie chart
  const data = [
    { name: 'Sold', value: sold, color: '#4f46e5' },
    { name: 'Remaining', value: remaining, color: '#e5e7eb' }
  ];
  
  // Data for usage pie chart
  const usageData = [
    { name: 'Used', value: used, color: '#10b981' },
    { name: 'Unused', value: sold - used, color: '#f59e0b' }
  ];
  
  const COLORS = ['#4f46e5', '#e5e7eb', '#10b981', '#f59e0b'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Ticket Sales</CardTitle>
          <CardDescription>Sold vs. Remaining Tickets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.map((entry, index) => (
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
              <p className="text-sm text-muted-foreground">Sold</p>
              <p className="text-2xl font-bold text-primary">{sold}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold text-muted">{remaining}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {sold > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Ticket Usage</CardTitle>
            <CardDescription>Used vs. Unused Tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={usageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
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
                <p className="text-sm text-muted-foreground">Used</p>
                <p className="text-2xl font-bold text-green-500">{used}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Unused</p>
                <p className="text-2xl font-bold text-amber-500">{sold - used}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EventStats;