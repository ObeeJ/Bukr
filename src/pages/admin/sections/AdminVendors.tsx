import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminVendors, updateAdminVendor } from "@/api/admin";
import { vendorTierBadge } from "@/lib/badges";

export default function AdminVendors() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-vendors", page],
    queryFn: () => listAdminVendors({ page, limit: 20 }),
    staleTime: 60_000,
  });

  const vendors = data?.data?.vendors ?? [];
  const total = data?.data?.total ?? 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => updateAdminVendor(id, updates),
    onSuccess: () => { toast.success("Vendor updated"); qc.invalidateQueries({ queryKey: ["admin-vendors"] }); },
    onError: () => toast.error("Update failed"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-clash font-bold text-glow">Vendors</h1>
      <p className="text-xs text-muted-foreground">{total} vendors</p>

      {isLoading && ["s1","s2","s3","s4","s5"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-20" />)}

      <div className="space-y-2">
        {vendors.map((v: any) => (
          <Card key={v.id} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{v.businessName}</p>
                    {v.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-blue-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{v.category} · {v.city}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Star className="h-3 w-3" />{Number(v.bayesianRating ?? 0).toFixed(1)}</span>
                    <span>{v.hireCount ?? 0} hires</span>
                    <span>{Math.round(Number(v.completionRate ?? 1) * 100)}% completion</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant="outline" className={`text-xs ${vendorTierBadge[v.tier] ?? ""}`}>{v.tier}</Badge>
                  {!v.isVerified && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-blue-500/30 text-blue-400"
                      onClick={() => updateMutation.mutate({ id: v.id, updates: { isVerified: true } })}
                    >
                      Verify
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={vendors.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
