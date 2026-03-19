import { useQuery } from "@tanstack/react-query";
import { DollarSign, Ticket, CalendarDays, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, getRevenueStream } from "@/api/admin";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const SOURCE_LABELS: Record<string, string> = {
  ticket_fee: "Ticket Fees",
  bukrshield_fee: "BukrShield",
  vendor_commission: "Vendor Commission",
  event_credit: "Credits",
  featured_listing: "Featured Listings",
  vendor_pro: "Vendor Pro",
  vendor_verified: "Vendor Verified",
};

export default function AdminOverview() {
  const { data: overviewData, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ["admin-revenue-stream"],
    queryFn: () => getRevenueStream({ limit: 7 }),
    staleTime: 60_000,
  });

  const kpis = overviewData?.data ?? {};
  const revenueBySource = revenueData?.data?.bySource ?? [];

  const kpiCards = [
    { label: "Revenue Today", value: `₦${Number(kpis.revenueToday ?? 0).toLocaleString()}`, icon: <DollarSign className="h-4 w-4" />, color: "text-green-400" },
    { label: "Revenue This Month", value: `₦${Number(kpis.revenueMonth ?? 0).toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" />, color: "text-primary" },
    { label: "Tickets Today", value: kpis.ticketsToday ?? 0, icon: <Ticket className="h-4 w-4" />, color: "text-blue-400" },
    { label: "Active Events", value: kpis.activeEvents ?? 0, icon: <CalendarDays className="h-4 w-4" />, color: "text-yellow-400" },
    { label: "New Users Today", value: kpis.newUsersToday ?? 0, icon: <Users className="h-4 w-4" />, color: "text-pink-400" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-clash font-bold text-glow">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Live metrics — refreshes every 30 seconds.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map(kpi => (
          <Card key={kpi.label} className="glass-card">
            <CardContent className="p-3">
              <div className={`${kpi.color} mb-1`}>{kpi.icon}</div>
              {isLoading ? (
                <div className="h-6 bg-muted animate-pulse rounded w-16 mt-1" />
              ) : (
                <p className="text-lg font-bold leading-tight">{kpi.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by source chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Stream</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueBySource} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="source" tickFormatter={(v: string) => SOURCE_LABELS[v] ?? v} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => `₦${Number(val).toLocaleString()}`}
                  labelFormatter={(label: string) => SOURCE_LABELS[label] ?? label}
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {revenueBySource.map((_: unknown, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
