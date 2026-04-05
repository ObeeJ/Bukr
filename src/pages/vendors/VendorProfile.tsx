import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Star, MapPin, BadgeCheck, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getVendor, requestHire } from "@/api/vendors";
import { useUser } from "@/hooks/useUser";
import { vendorTierBadge } from "@/lib/badges";

export default function VendorProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const [hireOpen, setHireOpen] = useState(false);
  const [eventId, setEventId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => getVendor(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const vendor = data;

  const hireMutation = useMutation({
    mutationFn: () => requestHire({
      vendorId: id!,
      eventId,
      proposedAmount: amount ? Number(amount) : undefined,
      message: message || undefined,
    }),
    onSuccess: () => {
      toast.success("Hire request sent!", { description: "Vendor locked in — your event just levelled up." });
      setHireOpen(false);
      setEventId(""); setAmount(""); setMessage("");
    },
    onError: () => toast.error("Couldn't send request", { description: "Something went wrong on our end. Try again in a moment." }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {["s1","s2","s3","s4"].map(k => <div key={k} className="glass-card p-4 rounded-xl animate-pulse h-24" />)}
        </div>
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-lg mb-4">This vendor left the building. Try another.</p>
        <Link to="/vendors"><Button variant="outline">Back to Marketplace</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Back */}
        <Link to="/vendors" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" /> Marketplace
        </Link>

        {/* Hero card */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-clash font-bold text-foreground">{vendor.businessName}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{vendor.category}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {vendor.isVerified && (
                <span className="flex items-center gap-1 text-xs text-blue-400">
                  <BadgeCheck className="h-3.5 w-3.5" /> Bukr Verified
                </span>
              )}
              <Badge variant="outline" className={`text-xs ${vendorTierBadge[vendor.tier] ?? ""}`}>
                {vendor.tier}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{vendor.location}{vendor.servesNationwide ? " · Serves nationwide" : ""}</span>
          </div>

          {vendor.bio && <p className="text-sm text-muted-foreground leading-relaxed">{vendor.bio}</p>}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/30">
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5 font-semibold">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {Number(vendor.bayesianRating ?? 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">{vendor.reviewCount} reviews</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{vendor.hireCount}</p>
              <p className="text-xs text-muted-foreground">hires</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{Math.round(Number(vendor.completionRate ?? 1) * 100)}%</p>
              <p className="text-xs text-muted-foreground">completion</p>
            </div>
          </div>

          {user?.userType === "organizer" && (
            <Button variant="glow" className="w-full mt-2" onClick={() => setHireOpen(true)}>
              Request to Hire
            </Button>
          )}
        </div>

        {/* Portfolio */}
        {vendor.portfolioUrls?.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h2 className="font-semibold mb-3">Portfolio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {vendor.portfolioUrls.map((url: string, i: number) => (
                <img key={i} src={url} alt={`Portfolio ${i + 1}`} className="rounded-lg aspect-square object-cover w-full" loading="lazy" />
              ))}
            </div>
          </div>
        )}

        {/* Hire request dialog */}
        <Dialog open={hireOpen} onOpenChange={setHireOpen}>
          <DialogContent className="glass-card border-border/50 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-clash">Request to Hire {vendor.businessName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Event ID</label>
                <Input
                  className="h-11 text-base"
                  placeholder="Paste your event ID"
                  value={eventId}
                  onChange={e => setEventId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Budget offer (₦, optional)</label>
                <Input
                  className="h-11 text-base"
                  type="number"
                  placeholder="e.g. 50000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Message (optional)</label>
                <Textarea
                  className="text-base"
                  placeholder="Tell them about your event..."
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
              <Button
                variant="glow"
                className="w-full"
                disabled={!eventId || hireMutation.isPending}
                onClick={() => hireMutation.mutate()}
              >
                {hireMutation.isPending ? "Sending..." : "Send Hire Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
