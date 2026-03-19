import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Copy, TrendingUp, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getInfluencerProfile, getInfluencerLinks } from "@/api/influencer";

export default function InfluencerDashboard() {
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["influencer-profile"],
    queryFn: getInfluencerProfile,
    staleTime: 5 * 60_000,
  });

  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ["influencer-links"],
    queryFn: getInfluencerLinks,
    staleTime: 60_000,
  });

  const profile = profileData?.data;
  const links = linksData?.data?.links ?? [];

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Referral link copied!");
    });
  };

  const pendingEarnings = Number(profile?.pendingEarnings ?? 0);
  const canRequestPayout = pendingEarnings >= 5000;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6 space-y-4">
        {["s1","s2","s3","s4"].map(k => <div key={k} className="glass-card p-4 rounded-xl animate-pulse h-20" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Influencer Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every link you share is a ticket sold. Keep going — your wallet is watching.
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Referrals", value: profile?.totalReferrals ?? 0, icon: <Users className="h-4 w-4" /> },
            { label: "Revenue Generated", value: `₦${Number(profile?.totalRevenue ?? 0).toLocaleString()}`, icon: <TrendingUp className="h-4 w-4" /> },
            { label: "Pending Earnings", value: `₦${pendingEarnings.toLocaleString()}`, icon: <DollarSign className="h-4 w-4" /> },
          ].map(stat => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="flex justify-center text-primary mb-1">{stat.icon}</div>
                <p className="text-lg font-bold leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Payout CTA */}
        {pendingEarnings > 0 && (
          <div className={`glass-card rounded-xl p-4 flex items-center justify-between gap-3 border ${canRequestPayout ? "border-primary/30" : "border-border/30"}`}>
            <div>
              <p className="text-sm font-medium">
                {canRequestPayout ? "Ready to cash out!" : `₦${(5000 - pendingEarnings).toLocaleString()} more until payout`}
              </p>
              <p className="text-xs text-muted-foreground">Minimum payout: ₦5,000</p>
            </div>
            <Link to="/influencer/payouts">
              <Button variant={canRequestPayout ? "glow" : "outline"} size="sm" disabled={!canRequestPayout}>
                {canRequestPayout ? "Request Payout" : "Not Yet"}
              </Button>
            </Link>
          </div>
        )}

        {/* Referral links */}
        <div>
          <h2 className="font-semibold mb-3">Your Referral Links</h2>
          {linksLoading && ["s1","s2","s3"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16 mb-2" />)}

          {!linksLoading && links.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p>No events assigned yet.</p>
              <p className="text-sm">Ask your organizer to add you to an event.</p>
            </div>
          )}

          {links.map((link: any) => (
            <Card key={link.eventId} className="glass-card mb-3">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{link.eventTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {link.ticketsSold ?? 0} tickets sold · ₦{Number(link.earnings ?? 0).toLocaleString()} earned
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-xs">{link.discountPercent}% discount for buyers</Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 px-3"
                    onClick={() => copyLink(link.referralUrl)}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
