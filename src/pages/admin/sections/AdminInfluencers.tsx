import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listAdminInfluencers, approvePayout, rejectPayout } from "@/api/admin";

export default function AdminInfluencers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-influencers", page],
    queryFn: () => listAdminInfluencers({ page, limit: 20 }),
    staleTime: 30_000,
  });

  const influencers = data?.influencers ?? [];
  const pendingPayouts = data?.pendingPayouts ?? [];
  const total = data?.total ?? 0;

  const approveMutation = useMutation({
    mutationFn: (payoutId: string) => approvePayout(payoutId),
    onSuccess: () => { toast.success("Payout approved"); qc.invalidateQueries({ queryKey: ["admin-influencers"] }); },
    onError: () => toast.error("Approval failed"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => rejectPayout(id, note),
    onSuccess: () => { toast.success("Payout rejected"); qc.invalidateQueries({ queryKey: ["admin-influencers"] }); },
    onError: () => toast.error("Rejection failed"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-clash font-bold text-glow">Influencers</h1>

      {/* Pending payouts */}
      {pendingPayouts.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 text-yellow-400">Pending Payouts ({pendingPayouts.length})</h2>
          <div className="space-y-2">
            {pendingPayouts.map((p: any) => (
              <Card key={p.id} className="glass-card border-yellow-500/20">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{p.influencerName ?? p.influencerId?.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">₦{Number(p.amount).toLocaleString()} · {new Date(p.requestedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="glow" className="h-7 text-xs" disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(p.id)}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400" disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate({ id: p.id, note: "Rejected by admin" })}>
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All influencers */}
      <div>
        <h2 className="font-semibold mb-3">All Influencers ({total})</h2>
        {isLoading && ["s1","s2","s3","s4","s5"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16 mb-2" />)}
        <div className="space-y-2">
          {influencers.map((inf: any) => (
            <Card key={inf.id} className="glass-card">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{inf.name ?? inf.email ?? inf.id?.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {inf.totalReferrals ?? 0} referrals · ₦{Number(inf.totalRevenue ?? 0).toLocaleString()} revenue
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-yellow-400 font-medium">₦{Number(inf.pendingEarnings ?? 0).toLocaleString()} pending</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={influencers.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
