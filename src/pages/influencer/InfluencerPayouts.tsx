import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getInfluencerProfile, getPayoutHistory, requestPayout } from "@/api/influencer";
import { payoutStatusBadge } from "@/lib/badges";

export default function InfluencerPayouts() {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const { data: profileData } = useQuery({
    queryKey: ["influencer-profile"],
    queryFn: getInfluencerProfile,
  });

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["payout-history"],
    queryFn: getPayoutHistory,
    staleTime: 30_000,
  });

  const profile = profileData?.data;
  const history = historyData?.data?.payouts ?? [];
  const pendingEarnings = Number(profile?.pendingEarnings ?? 0);

  const mutation = useMutation({
    mutationFn: () => requestPayout({ amount: Number(amount), bankCode, accountNumber, accountName }),
    onSuccess: () => {
      toast.success("Payout requested!", { description: "Your earnings are on the way. Don't spend it all at once." });
      setAmount(""); setBankCode(""); setAccountNumber(""); setAccountName("");
      qc.invalidateQueries({ queryKey: ["influencer-profile"] });
      qc.invalidateQueries({ queryKey: ["payout-history"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Payout request failed. Try again.";
      toast.error("Couldn't request payout", { description: msg });
    },
  });

  const amountNum = Number(amount);
  const canSubmit = amountNum >= 5000 && amountNum <= pendingEarnings && bankCode && accountNumber && accountName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <Link to="/influencer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Dashboard
        </Link>

        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Payouts</h1>
          <p className="text-muted-foreground text-sm mt-1">Available to withdraw: ₦{pendingEarnings.toLocaleString()}</p>
        </div>

        {/* Request form */}
        {pendingEarnings >= 5000 && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold">Request a Payout</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground mb-1.5 block">Amount (₦)</label>
                <Input
                  className="h-11 text-base"
                  type="number"
                  min="5000"
                  max={pendingEarnings}
                  placeholder="Minimum ₦5,000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Bank code</label>
                <Input className="h-11 text-base" placeholder="058" value={bankCode} onChange={e => setBankCode(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Account number</label>
                <Input className="h-11 text-base" placeholder="0123456789" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-muted-foreground mb-1.5 block">Account name</label>
                <Input className="h-11 text-base" placeholder="As it appears on your bank" value={accountName} onChange={e => setAccountName(e.target.value)} />
              </div>
            </div>
            <Button variant="glow" className="w-full" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Requesting..." : "Request Payout"}
            </Button>
          </div>
        )}

        {pendingEarnings < 5000 && pendingEarnings > 0 && (
          <div className="glass-card rounded-xl p-4 text-sm text-muted-foreground border border-border/30">
            Keep going — you need ₦{(5000 - pendingEarnings).toLocaleString()} more to unlock a payout.
          </div>
        )}

        {/* History */}
        <div>
          <h2 className="font-semibold mb-3">Payout History</h2>
          {isLoading && ["s1","s2","s3"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16 mb-2" />)}
          {!isLoading && history.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No payouts yet.</p>
          )}
          {history.map((p: any) => (
            <Card key={p.id} className="glass-card mb-3">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">₦{Number(p.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {new Date(p.requestedAt).toLocaleDateString()}
                    {p.paidAt && ` · Paid ${new Date(p.paidAt).toLocaleDateString()}`}
                  </p>
                </div>
                <Badge variant="outline" className={`text-xs ${payoutStatusBadge[p.status] ?? ""}`}>
                  {p.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
