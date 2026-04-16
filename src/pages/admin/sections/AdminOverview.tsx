import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Ticket, CalendarDays, Users, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, getRevenueStream, getFinanceSummary, getOverviewTimeseries } from "@/api/admin";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
} from "recharts";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const SOURCE_LABELS: Record<string, string> = {
  ticket_fee:           "Ticket Fees",
  bukrshield_fee:       "BukrShield",
  vendor_commission:    "Vendor Commission",
  event_credit:         "Credits",
  featured_listing:     "Featured Listings",
  vendor_pro:           "Vendor Pro",
  vendor_verified:      "Vendor Verified",
  influencer_activation:"Influencer",
  gate_sale_activation: "Gate Sale",
};

const WINDOWS = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const TOOLTIP_STYLE = {
  background: "hsl(213 60% 8%)",
  border: "1px solid hsl(193 100% 75% / 0.15)",
  borderRadius: 8,
  fontSize: 12,
};

export default function AdminOverview() {
  const [timeWindow, setTimeWindow] = useState(30);

  const { data: overviewData, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: revenueData } = useQuery({
    queryKey: ["admin-revenue-stream", timeWindow],
    queryFn: () => getRevenueStream({ limit: 100 }),
    staleTime: 60_000,
  });

  const { data: summaryData } = useQuery({
    queryKey: ["admin-finance-summary"],
    queryFn: getFinanceSummary,
    staleTime: 60_000,
  });

  // Real timeseries — pre-aggregated daily totals from DB.
  // Previously built client-side from paginated ledger entries (wrong — only covered last N rows).
  const { data: timeseriesData } = useQuery({
    queryKey: ["admin-overview-timeseries", timeWindow],
    queryFn: () => getOverviewTimeseries(timeWindow),
    staleTime: 60_000,
  });

  const kpis = overviewData ?? {};
  const revenueBySource = (revenueData as any)?.bySource ?? [];
  const trendData = ((timeseriesData as any)?.days ?? []).map((d: any) => ({
    date: (d.day ?? "").slice(5),
    total: Number(d.revenue ?? 0),
    tickets: Number(d.ticketCount ?? 0),
  }));

  const summary = summaryData ?? {};

  const kpiCards = [
    { label: "Revenue Today",      value: `₦${Number(kpis.revenueToday  ?? 0).toLocaleString()}`, icon: <DollarSign className="h-4 w-4" />, color: "text-green-400" },
    { label: "Revenue This Month", value: `₦${Number(kpis.revenueMonth  ?? 0).toLocaleString()}`, icon: <TrendingUp  className="h-4 w-4" />, color: "text-primary"  },
    { label: "All Time",           value: `₦${Number(summary.allTime    ?? 0).toLocaleString()}`, icon: <DollarSign className="h-4 w-4" />, color: "text-purple-400"},
    { label: "Tickets Today",      value: kpis.ticketsToday  ?? 0,                                icon: <Ticket      className="h-4 w-4" />, color: "text-blue-400" },
    { label: "Active Events",      value: kpis.activeEvents  ?? 0,                                icon: <CalendarDays className="h-4 w-4" />, color: "text-yellow-400"},
    { label: "New Users Today",    value: kpis.newUsersToday ?? 0,                                icon: <Users       className="h-4 w-4" />, color: "text-pink-400" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-clash font-bold text-glow">Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Live metrics — refreshes every 30 seconds.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Revenue trend — time-windowed */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">Revenue Trend</CardTitle>
            <div className="flex gap-1">
              {WINDOWS.map(w => (
                <button
                  key={w.days}
                  onClick={() => setTimeWindow(w.days)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    timeWindow === w.days
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(213 45% 20% / 0.5)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => [`₦${Number(val).toLocaleString()}`, "Revenue"]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(193 100% 65%)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "hsl(193 100% 65%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue by source bar chart */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue by Stream</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueBySource.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueBySource} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="source"
                  tickFormatter={(v: string) => SOURCE_LABELS[v] ?? v}
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: number) => `₦${Number(val).toLocaleString()}`}
                  labelFormatter={(label: string) => SOURCE_LABELS[label] ?? label}
                  contentStyle={TOOLTIP_STYLE}
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
