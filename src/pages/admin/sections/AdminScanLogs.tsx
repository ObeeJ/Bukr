import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScanLine, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listScanLogs } from "@/api/admin";

const RESULT_STYLES: Record<string, string> = {
  valid:        "border-green-500/30 text-green-400",
  invalid:      "border-red-500/30 text-red-400",
  already_used: "border-yellow-500/30 text-yellow-400",
};

const RESULTS = ["", "valid", "invalid", "already_used"];

export default function AdminScanLogs() {
  const [page, setPage]         = useState(1);
  const [resultFilter, setResultFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-scan-logs", { page, result: resultFilter }],
    queryFn: () => listScanLogs({ page, limit: 30, result: resultFilter || undefined }),
    staleTime: 30_000,
  });

  const logs    = data?.logs ?? [];
  const total   = data?.total ?? 0;
  const summary = data?.summary ?? {};

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <ScanLine className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Scan Logs</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Door scan activity. High <span className="text-yellow-400">already_used</span> count is a fraud signal.
          </p>
        </div>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Valid",        value: summary.valid        ?? 0, color: "text-green-400"  },
          { label: "Invalid",      value: summary.invalid      ?? 0, color: "text-red-400"    },
          { label: "Already Used", value: summary.alreadyUsed  ?? 0, color: "text-yellow-400" },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-3">
              <p className={`text-lg font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <select
          aria-label="Filter by result"
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={resultFilter}
          onChange={e => { setResultFilter(e.target.value); setPage(1); }}
        >
          {RESULTS.map(r => (
            <option key={r} value={r}>{r === "" ? "All results" : r.replace("_", " ")}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">{total} entries</span>
      </div>

      {isLoading && [1,2,3,4,5].map(k => (
        <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-14" />
      ))}

      <div className="space-y-1.5">
        {logs.map((log: any) => (
          <Card key={log.id} className={`glass-card ${log.result === "already_used" ? "border-yellow-500/15" : ""}`}>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {log.result === "already_used" && (
                    <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                  )}
                  <p className="text-sm font-medium truncate">{log.eventTitle || "—"}</p>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {log.ticketId?.slice(0, 16)}… · {log.accessCode || "organizer"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="outline" className={`text-xs ${RESULT_STYLES[log.result] ?? ""}`}>
                  {log.result?.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.scannedAt).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {logs.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">No scan activity yet.</p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={logs.length < 30} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
