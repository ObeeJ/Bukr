import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Settings, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeatureFlags, updateFeatureFlags, getSystemLogs } from "@/api/admin";

export default function AdminSystem() {
  const qc = useQueryClient();

  const { data: flagsData, isLoading: flagsLoading } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: getFeatureFlags,
    staleTime: 60_000,
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ["admin-system-logs"],
    queryFn: () => getSystemLogs({ limit: 20 }),
    staleTime: 30_000,
  });

  const flags = flagsData?.data?.flags ?? {};
  const logs = logsData?.data?.logs ?? [];

  const flagMutation = useMutation({
    mutationFn: (updates: Record<string, unknown>) => updateFeatureFlags(updates),
    onSuccess: () => { toast.success("Feature flags updated"); qc.invalidateQueries({ queryKey: ["admin-feature-flags"] }); },
    onError: () => toast.error("Update failed"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-clash font-bold text-glow">System Control</h1>
      </div>

      {/* Feature flags */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flagsLoading && <div className="h-20 animate-pulse bg-muted rounded" />}
          {!flagsLoading && Object.keys(flags).length === 0 && (
            <p className="text-sm text-muted-foreground">No flags configured.</p>
          )}
          {Object.entries(flags).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-border/20 last:border-0">
              <div>
                <p className="text-sm font-medium">{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                <p className="text-xs text-muted-foreground font-mono">{key}</p>
              </div>
              <button
                onClick={() => flagMutation.mutate({ [key]: !value })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? "bg-primary" : "bg-muted"
                }`}
                disabled={flagMutation.isPending}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent error logs */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" /> Recent Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading && <div className="h-24 animate-pulse bg-muted rounded" />}
          {!logsLoading && logs.length === 0 && (
            <p className="text-sm text-muted-foreground">No recent errors. All clear.</p>
          )}
          <div className="space-y-1.5">
            {logs.map((log: any, i: number) => (
              <div key={i} className="text-xs font-mono p-2 bg-muted/50 rounded">
                <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleString()} </span>
                <span className={log.level === "error" ? "text-red-400" : "text-yellow-400"}>[{log.level?.toUpperCase()}] </span>
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
