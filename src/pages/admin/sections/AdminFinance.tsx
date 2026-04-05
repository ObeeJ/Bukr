import { useQuery } from "@tanstack/react-query";
import { DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFinanceSummary, getRevenueStream } from "@/api/admin";

const SOURCE_LABELS: Record<string, string> = {
  ticket_fee: "Ticket Fees",
  bukrshield_fee: "BukrShield",
  vendor_commission: "Vendor Commission",
  event_credit: "Credits",
  featured_listing: "Featured Listings",
  vendor_pro: "Vendor Pro",
  vendor_verified: "Vendor Verified",
  influencer_activation: "Influencer Activation",
  gate_sale_activation: "Gate Sale",
};

export default function AdminFinance() {
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["admin-finance-summary"],
    queryFn: getFinanceSummary,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const { data: streamData, isLoading: streamLoading } = useQuery({
    queryKey: ["admin-revenue-stream-full"],
    queryFn: () => getRevenueStream({ limit: 50 }),
    staleTime: 60_000,
  });

  const summary = summaryData ?? {};
  const entries = streamData?.entries ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-clash font-bold text-glow">Finance</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Today", value: `₦${Number(summary.today ?? 0).toLocaleString()}` },
          { label: "This Week", value: `₦${Number(summary.week ?? 0).toLocaleString()}` },
          { label: "This Month", value: `₦${Number(summary.month ?? 0).toLocaleString()}` },
          { label: "All Time", value: `₦${Number(summary.allTime ?? 0).toLocaleString()}` },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-3">
              <DollarSign className="h-4 w-4 text-green-400 mb-1" />
              {summaryLoading ? <div className="h-6 bg-muted animate-pulse rounded w-16" /> : <p className="text-lg font-bold leading-tight">{s.value}</p>}
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by source breakdown */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Revenue by Source
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="space-y-2">{["s1","s2","s3","s4","s5"].map(k => <div key={k} className="h-8 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <div className="space-y-2">
              {(summary.bySource ?? []).map((row: any) => (
                <div key={row.source} className="flex items-center justify-between gap-3 py-1 border-b border-border/20 last:border-0">
                  <span className="text-sm">{SOURCE_LABELS[row.source] ?? row.source}</span>
                  <span className="font-medium text-sm">₦{Number(row.total ?? 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent revenue entries */}
      <div>
        <h2 className="font-semibold mb-3">Recent Transactions</h2>
        {streamLoading && ["s1","s2","s3","s4","s5"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-12 mb-2" />)}
        <div className="space-y-1.5">
          {entries.map((e: any) => (
            <div key={e.id} className="glass-card rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{SOURCE_LABELS[e.source] ?? e.source}</Badge>
                <span className="text-muted-foreground text-xs">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
              <span className="font-medium text-green-400">+₦{Number(e.amount).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
