import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listPayments } from "@/api/admin";

const STATUS_COLORS: Record<string, string> = {
  success:   "border-green-500/30 text-green-400",
  pending:   "border-yellow-500/30 text-yellow-400",
  failed:    "border-red-500/30 text-red-400",
  refunded:  "border-blue-500/30 text-blue-400",
};

const STATUSES = ["", "success", "pending", "failed", "refunded"];

export default function AdminPayments() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-payments", { page, status: statusFilter }],
    queryFn: () => listPayments({ page, limit: 25, status: statusFilter || undefined }),
    staleTime: 30_000,
  });

  const payments = data?.payments ?? [];
  const total    = data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-clash font-bold text-glow">Payments</h1>
        <p className="text-muted-foreground text-sm mt-1">All payment transactions across the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <select
          aria-label="Filter by status"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          {STATUSES.map(s => (
            <option key={s} value={s}>{s === "" ? "All statuses" : s}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{total} transactions</span>
      </div>

      {isLoading && [1,2,3,4,5].map(k => (
        <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16" />
      ))}

      <div className="space-y-2">
        {payments.map((p: any) => (
          <Card key={p.id} className="glass-card">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-mono text-muted-foreground">{p.reference}</p>
                <p className="text-sm font-medium truncate">{p.eventTitle || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {p.buyerEmail || "—"} · {p.provider} · {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className={`text-sm font-bold ${p.status === "success" ? "text-green-400" : p.status === "failed" ? "text-red-400" : "text-foreground"}`}>
                  ₦{Number(p.amount).toLocaleString()}
                </span>
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] ?? ""}`}>
                  {p.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {payments.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">No payments found.</p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={payments.length < 25} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
