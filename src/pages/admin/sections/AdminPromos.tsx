import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminPromos } from "@/api/admin";

export default function AdminPromos() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-promos", page],
    queryFn: () => listAdminPromos({ page, limit: 25 }),
    staleTime: 60_000,
  });

  const promos = data?.promos ?? [];
  const total  = data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Promo Codes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            All promo codes across all events. High usage rate may indicate abuse.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{total} promo codes</p>

      {isLoading && [1,2,3,4,5].map(k => (
        <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-20" />
      ))}

      <div className="space-y-2">
        {promos.map((p: any) => {
          const usagePct = p.usageRatePct != null ? Number(p.usageRatePct) : null;
          const isAbuse  = usagePct != null && usagePct >= 90 && p.usedCount > 10;

          return (
            <Card key={p.id} className={`glass-card ${isAbuse ? "border-red-500/20" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm">{p.code}</span>
                      {isAbuse && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle className="h-3 w-3" /> High usage
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.eventTitle || "—"}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{p.discountPercentage}% off</span>
                      <span>{p.usedCount} used{p.ticketLimit > 0 ? ` / ${p.ticketLimit}` : " (unlimited)"}</span>
                      {usagePct != null && (
                        <span className={usagePct >= 90 ? "text-red-400" : usagePct >= 70 ? "text-yellow-400" : "text-muted-foreground"}>
                          {usagePct.toFixed(0)}% used
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-xs ${p.isActive ? "border-green-500/30 text-green-400" : "border-border text-muted-foreground"}`}
                    >
                      {p.isActive ? "active" : "inactive"}
                    </Badge>
                    {p.expiresAt && (
                      <span className="text-xs text-muted-foreground">
                        exp {new Date(p.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {promos.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">No promo codes found.</p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={promos.length < 25} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
