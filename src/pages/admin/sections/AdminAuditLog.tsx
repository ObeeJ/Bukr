import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuditLog } from "@/api/admin";

const ACTION_COLORS: Record<string, string> = {
  "user.deactivate":     "border-red-500/30 text-red-400",
  "user.reactivate":     "border-green-500/30 text-green-400",
  "user.role_change":    "border-yellow-500/30 text-yellow-400",
  "event.feature":       "border-yellow-500/30 text-yellow-400",
  "event.unfeature":     "border-border text-muted-foreground",
  "event.status_change": "border-blue-500/30 text-blue-400",
  "vendor.verify":       "border-blue-500/30 text-blue-400",
  "vendor.tier_change":  "border-purple-500/30 text-purple-400",
  "payout.approve":      "border-green-500/30 text-green-400",
  "payout.reject":       "border-red-500/30 text-red-400",
  "flag.update":         "border-purple-500/30 text-purple-400",
};

const ENTITY_TYPES = ["", "user", "event", "vendor", "payout", "system"];

function AuditRow({ log }: { log: any }) {
  const [open, setOpen] = useState(false);
  let meta: any = {};
  try { meta = JSON.parse(log.meta || "{}"); } catch { /* keep raw */ }

  return (
    <Card className="glass-card">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`text-xs ${ACTION_COLORS[log.action] ?? "border-border text-muted-foreground"}`}
              >
                {log.action}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {log.entityType}/{log.entityId?.slice(0, 8) || "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {log.adminEmail} · {log.ip || "—"} · {new Date(log.createdAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={() => setOpen(o => !o)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            aria-label="Toggle meta"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>

        {open && (
          <pre className="mt-2 text-xs bg-muted/30 rounded-lg p-2 overflow-x-auto text-muted-foreground border border-border/30 leading-relaxed">
            {JSON.stringify(meta, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAuditLog() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-log", { page, entityType }],
    queryFn: () => getAuditLog({ page, limit: 30, entityType: entityType || undefined }),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const logs  = data?.data?.logs ?? [];
  const total = data?.data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Audit Log</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Immutable record of every admin action. Nothing is deleted from here.
          </p>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <select
          aria-label="Filter by entity type"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={entityType}
          onChange={e => { setEntityType(e.target.value); setPage(1); }}
        >
          {ENTITY_TYPES.map(t => (
            <option key={t} value={t}>{t === "" ? "All entities" : t}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{total} entries</span>
      </div>

      {isLoading && [1,2,3,4,5].map(k => (
        <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16" />
      ))}

      <div className="space-y-2">
        {logs.map((log: any) => <AuditRow key={log.id} log={log} />)}
      </div>

      {logs.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">
          No audit entries yet. Actions will appear here once admins make changes.
        </p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={logs.length < 30} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
