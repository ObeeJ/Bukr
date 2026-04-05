import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminTickets } from "@/api/admin";
import { ticketStatusBadge } from "@/lib/badges";

export default function AdminTickets() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tickets", { page, status: statusFilter }],
    queryFn: () => listAdminTickets({ page, limit: 25, status: statusFilter || undefined }),
    staleTime: 30_000,
  });

  const tickets = data?.tickets ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-clash font-bold text-glow">Tickets</h1>

      <div className="flex gap-2">
        <select
          aria-label="Filter by status"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {["valid", "used", "cancelled", "pending"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="self-center text-xs text-muted-foreground">{total} tickets</span>
      </div>

      {isLoading && ["s1","s2","s3","s4","s5"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-14" />)}

      <div className="space-y-2">
        {tickets.map((t: any) => (
          <Card key={t.id} className="glass-card">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-mono text-muted-foreground">{t.id?.slice(0, 16)}…</p>
                <p className="text-sm font-medium truncate">{t.eventTitle ?? t.eventId?.slice(0, 8)}</p>
                <p className="text-xs text-muted-foreground">{t.buyerEmail ?? "—"} · ₦{Number(t.amount ?? 0).toLocaleString()}</p>
              </div>
              <Badge variant="outline" className={`text-xs shrink-0 ${ticketStatusBadge[t.status] ?? ""}`}>{t.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={tickets.length < 25} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
