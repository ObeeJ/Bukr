import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyCredits, purchaseCredits, CREDIT_PLANS, CreditPackType } from "@/api/credits";

export default function CreditsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-credits"],
    queryFn: getMyCredits,
    staleTime: 60_000,
  });

  const credits = data;
  const activePack = credits?.activePack;
  const remaining = credits?.creditsRemaining ?? 0;
  const expiry = credits?.expiresAt ? new Date(credits.expiresAt).toLocaleDateString() : null;

  const purchaseMutation = useMutation({
    mutationFn: (packType: CreditPackType) => purchaseCredits(packType),
    onSuccess: (res) => {
      const url = res?.authorizationUrl;
      if (url) window.location.href = url;
      else toast.success("Credits added!", { description: "Your event credits are ready to use." });
    },
    onError: () => toast.error("Purchase failed", { description: "Something went wrong on our end. Try again in a moment." }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Event Credits</h1>
          <p className="text-muted-foreground text-sm mt-1">Buy when you need it. No month-end billing surprises.</p>
        </div>

        {/* Current balance */}
        {isLoading ? (
          <div className="glass-card p-4 rounded-xl animate-pulse h-20" />
        ) : (
          <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Credits remaining</p>
              <p className="text-2xl font-bold">
                {activePack === "annual" ? "∞" : remaining}
                {activePack === "annual" && <span className="text-sm font-normal text-muted-foreground ml-2">Unlimited</span>}
              </p>
              {expiry && <p className="text-xs text-muted-foreground mt-0.5">Valid until {expiry}</p>}
            </div>
            {activePack && (
              <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                {activePack.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}
              </Badge>
            )}
          </div>
        )}

        {/* Credit plans */}
        <div className="space-y-3">
          <h2 className="font-semibold">Get More Credits</h2>
          {CREDIT_PLANS.map(plan => (
            <Card key={plan.packType} className="glass-card">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      {plan.label}
                      {plan.packType === "pro_pack" && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">Most popular</span>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      ₦{plan.price.toLocaleString()}
                      {plan.creditsTotal > 0 && ` · ${plan.creditsTotal} event${plan.creditsTotal !== 1 ? "s" : ""}`}
                      {plan.creditsTotal === -1 && " · Unlimited events/year"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={plan.packType === "pro_pack" ? "glow" : "outline"}
                    className="shrink-0 h-8"
                    disabled={purchaseMutation.isPending}
                    onClick={() => purchaseMutation.mutate(plan.packType)}
                  >
                    <Zap className="h-3.5 w-3.5 mr-1" /> Buy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-xs text-muted-foreground">{plan.description}</p>
                {plan.featuredIncluded > 0 && (
                  <p className="text-xs text-primary mt-1 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    {plan.featuredIncluded} featured listing{plan.featuredIncluded !== 1 ? "s" : ""} included
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          <p className="text-xs text-center text-muted-foreground pt-2">
            Credits valid for 12 months from purchase. Add-ons (extra influencer slots, scanner, featured listing) available separately.
          </p>
        </div>
      </div>
    </div>
  );
}
