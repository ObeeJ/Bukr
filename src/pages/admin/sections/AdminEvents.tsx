import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listAdminEvents, updateAdminEvent } from "@/api/admin";
import { eventStatusBadge } from "@/lib/badges";

const EVENT_STATUSES = ["active", "draft", "completed", "cancelled"];

export default function AdminEvents() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-events", page, statusFilter],
    queryFn: () => listAdminEvents({ page, limit: 20, status: statusFilter || undefined }),
    staleTime: 30_000,
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => updateAdminEvent(id, updates),
    onSuccess: () => { toast.success("Event updated"); qc.invalidateQueries({ queryKey: ["admin-events"] }); },
    onError: () => toast.error("Update failed"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-clash font-bold text-glow">Events</h1>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <select
          aria-label="Filter by status"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          {EVENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{total} total events</span>
      </div>

      {isLoading && ["s1","s2","s3","s4","s5"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-20" />)}

      <div className="space-y-2">
        {events.map((ev: any) => (
          <Card key={ev.id} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{ev.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ev.organizerEmail ?? ev.organizerId?.slice(0, 8)} · {new Date(ev.date).toLocaleDateString()}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{ev.ticketsSold ?? 0}/{ev.totalTickets ?? "?"} tickets</span>
                    <span>₦{Number(ev.totalRevenue ?? 0).toLocaleString()} revenue</span>
                    {ev.isFeatured && <span className="text-yellow-400">★ Featured</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${eventStatusBadge[ev.status] ?? ""}`}>{ev.status}</Badge>

                  {/* Status change — backend supports active/draft/completed/cancelled */}
                  <Select
                    value={ev.status}
                    onValueChange={val => updateMutation.mutate({ id: ev.id, updates: { status: val } })}
                  >
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs ${ev.isFeatured ? "border-red-500/30 text-red-400" : "border-yellow-500/30 text-yellow-400"}`}
                    onClick={() => updateMutation.mutate({ id: ev.id, updates: { isFeatured: !ev.isFeatured } })}
                  >
                    {ev.isFeatured ? "Unfeature" : "Feature"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={events.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
