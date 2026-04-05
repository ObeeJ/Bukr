import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Plus, CheckCircle2, Clock, XCircle,
  Star, MapPin, Sparkles, ChevronRight, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  searchVendors, matchVendors, requestHire,
  completeHire, type HireRequest
} from "@/api/vendors";
import { mapFromApi } from "@/lib/api";
import api from "@/lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:        { label: "Pending",        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: <Clock className="h-3 w-3" /> },
  accepted:       { label: "Accepted",       color: "bg-green-500/20 text-green-400 border-green-500/30",   icon: <CheckCircle2 className="h-3 w-3" /> },
  counter_offered:{ label: "Counter Offer",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30",      icon: <Clock className="h-3 w-3" /> },
  declined:       { label: "Declined",       color: "bg-red-500/20 text-red-400 border-red-500/30",         icon: <XCircle className="h-3 w-3" /> },
  completed:      { label: "Completed",      color: "bg-primary/20 text-primary border-primary/30",         icon: <CheckCircle2 className="h-3 w-3" /> },
  disputed:       { label: "Disputed",       color: "bg-orange-500/20 text-orange-400 border-orange-500/30",icon: <XCircle className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, color: "bg-muted text-muted-foreground border-border", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function EventVendors() {
  const { eventId } = useParams<{ eventId: string }>();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"hired" | "browse" | "ai">("hired");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  // Hire request dialog state
  const [hireTarget, setHireTarget] = useState<{ id: string; name: string } | null>(null);
  const [proposedAmount, setProposedAmount] = useState("");
  const [message, setMessage] = useState("");

  // Complete hire dialog state
  const [completeTarget, setCompleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [agreedAmount, setAgreedAmount] = useState("");

  // ── queries ────────────────────────────────────────────────────────────────

  // Hires already placed for this event
  const { data: hiresData, isLoading: hiresLoading } = useQuery({
    queryKey: ["event-hires", eventId],
    queryFn: async () => {
      const { data } = await api.get(`/vendor-hires/event/${eventId}`);
      return mapFromApi(data);
    },
    enabled: !!eventId,
    staleTime: 30_000,
  });

  // Vendor marketplace browse
  const { data: browseData, isLoading: browseLoading } = useQuery({
    queryKey: ["vendors-browse", category, search],
    queryFn: () => searchVendors({ category: category || undefined, city: search || undefined, limit: 20 }),
    enabled: tab === "browse",
    staleTime: 60_000,
  });

  // AI matchmaking
  const { data: matchData, isLoading: matchLoading } = useQuery({
    queryKey: ["vendors-match", eventId],
    queryFn: () => matchVendors(eventId!),
    enabled: tab === "ai" && !!eventId,
    staleTime: 5 * 60_000,
  });

  // ── mutations ──────────────────────────────────────────────────────────────

  const hireMutation = useMutation({
    mutationFn: (req: HireRequest) => requestHire(req),
    onSuccess: () => {
      toast.success("Hire request sent", { description: "The vendor will be notified." });
      qc.invalidateQueries({ queryKey: ["event-hires", eventId] });
      setHireTarget(null);
      setProposedAmount("");
      setMessage("");
    },
    onError: () => toast.error("Failed to send hire request"),
  });

  const completeMutation = useMutation({
    mutationFn: ({ hireId, amount }: { hireId: string; amount: number }) =>
      completeHire(hireId, amount),
    onSuccess: () => {
      toast.success("Hire marked complete");
      qc.invalidateQueries({ queryKey: ["event-hires", eventId] });
      setCompleteTarget(null);
      setAgreedAmount("");
    },
    onError: () => toast.error("Failed to complete hire"),
  });

  const hires: any[] = hiresData?.hires ?? [];
  const vendors: any[] = browseData?.vendors ?? [];
  const matches: any[] = matchData ?? [];

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to={`/events/${eventId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-clash font-bold text-glow">Event Vendors</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Hire and manage vendors for this event</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full grid grid-cols-3 glass-card">
            <TabsTrigger value="hired">Hired ({hires.length})</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> AI Match
            </TabsTrigger>
          </TabsList>

          {/* ── HIRED TAB ── */}
          <TabsContent value="hired" className="mt-4 space-y-3">
            {hiresLoading && [1,2,3].map(k => (
              <div key={k} className="glass-card rounded-xl p-4 animate-pulse h-20" />
            ))}

            {!hiresLoading && hires.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">No vendors hired yet</p>
                <p className="text-sm mt-1">Browse the marketplace or use AI Match to find the right vendors.</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("ai")}>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Try AI Match
                </Button>
              </div>
            )}

            {hires.map((hire: any) => (
              <Card key={hire.id} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{hire.vendorName ?? "Vendor"}</p>
                        <Badge variant="outline" className="text-xs">{hire.category}</Badge>
                        <StatusBadge status={hire.status} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hire.proposedAmount
                          ? `Proposed: ₦${Number(hire.proposedAmount).toLocaleString()}`
                          : "No amount proposed"}
                        {hire.agreedAmount && ` · Agreed: ₦${Number(hire.agreedAmount).toLocaleString()}`}
                      </p>
                      {hire.counterAmount && (
                        <p className="text-xs text-blue-400 mt-0.5">
                          Counter offer: ₦{Number(hire.counterAmount).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Action: mark complete if accepted */}
                    {(hire.status === "accepted" || hire.status === "counter_offered") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 h-8 text-xs"
                        onClick={() => {
                          setCompleteTarget({ id: hire.id, name: hire.vendorName ?? "Vendor" });
                          setAgreedAmount(String(hire.agreedAmount ?? hire.counterAmount ?? ""));
                        }}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ── BROWSE TAB ── */}
          <TabsContent value="browse" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by city..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">All categories</option>
                {["DJ","Catering","Photography","Videography","MC","Decoration","Security","AV_Tech","Makeup","Ushers"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {browseLoading && [1,2,3].map(k => (
              <div key={k} className="glass-card rounded-xl p-4 animate-pulse h-24" />
            ))}

            {vendors.map((v: any) => (
              <VendorCard
                key={v.id}
                vendor={v}
                onHire={() => setHireTarget({ id: v.id, name: v.businessName })}
              />
            ))}

            {!browseLoading && vendors.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No vendors found. Try a different filter.</p>
            )}
          </TabsContent>

          {/* ── AI MATCH TAB ── */}
          <TabsContent value="ai" className="mt-4 space-y-5">
            {matchLoading && (
              <div className="text-center py-8 space-y-2">
                <Sparkles className="h-8 w-8 text-primary mx-auto animate-pulse" />
                <p className="text-sm text-muted-foreground">Finding the best vendors for your event...</p>
              </div>
            )}

            {!matchLoading && matches.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No matches found. Make sure your event has a category and location set.
              </p>
            )}

            {matches.map((group: any) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {group.category}
                </h3>
                <div className="space-y-2">
                  {group.vendors?.map((sv: any) => (
                    <Card key={sv.vendor.id} className="glass-card">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{sv.vendor.businessName}</p>
                              {sv.vendor.isVerified && (
                                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {Number(sv.vendor.bayesianRating ?? 0).toFixed(1)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{sv.vendor.city}
                              </span>
                              <span className="font-medium text-primary">
                                Score: {Math.round(sv.score)}
                              </span>
                            </div>
                            {sv.matchReasons?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {sv.matchReasons.map((r: string) => (
                                  <span key={r} className="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="glow"
                              className="h-7 text-xs px-3"
                              onClick={() => setHireTarget({ id: sv.vendor.id, name: sv.vendor.businessName })}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Hire
                            </Button>
                            <Link to={`/vendors/${sv.vendor.id}`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs px-3 w-full">
                                Profile <ChevronRight className="h-3 w-3 ml-0.5" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Hire Request Dialog ── */}
      <Dialog open={!!hireTarget} onOpenChange={() => setHireTarget(null)}>
        <DialogContent className="glass-card border-glass-border max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Hire {hireTarget?.name}</DialogTitle>
            <DialogDescription>Send a hire request with your proposed budget.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Proposed Amount (₦)</label>
              <Input
                type="number"
                placeholder="e.g. 50000"
                value={proposedAmount}
                onChange={e => setProposedAmount(e.target.value)}
                className="mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to let the vendor quote you.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Message (optional)</label>
              <Textarea
                placeholder="Describe your event and what you need..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>
            <Button
              variant="glow"
              className="w-full"
              disabled={hireMutation.isPending}
              onClick={() => {
                if (!hireTarget || !eventId) return;
                hireMutation.mutate({
                  vendorId: hireTarget.id,
                  eventId,
                  proposedAmount: proposedAmount ? Number(proposedAmount) : undefined,
                  message: message || undefined,
                });
              }}
            >
              {hireMutation.isPending ? "Sending..." : "Send Hire Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Complete Hire Dialog ── */}
      <Dialog open={!!completeTarget} onOpenChange={() => setCompleteTarget(null)}>
        <DialogContent className="glass-card border-glass-border max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Mark Hire Complete</DialogTitle>
            <DialogDescription>
              Confirm the final agreed amount for {completeTarget?.name}. This triggers their payout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Final Agreed Amount (₦)</label>
              <Input
                type="number"
                value={agreedAmount}
                onChange={e => setAgreedAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button
              variant="glow"
              className="w-full"
              disabled={completeMutation.isPending || !agreedAmount}
              onClick={() => {
                if (!completeTarget) return;
                completeMutation.mutate({ hireId: completeTarget.id, amount: Number(agreedAmount) });
              }}
            >
              {completeMutation.isPending ? "Confirming..." : "Confirm & Complete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── VendorCard sub-component ──────────────────────────────────────────────────

function VendorCard({ vendor, onHire }: { vendor: any; onHire: () => void }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{vendor.businessName}</p>
              <Badge variant="outline" className="text-xs">{vendor.category}</Badge>
              {vendor.isVerified && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {Number(vendor.bayesianRating ?? 0).toFixed(1)} ({vendor.reviewCount ?? 0})
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{vendor.city}
              </span>
            </div>
            {vendor.bio && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{vendor.bio}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" variant="glow" className="h-7 text-xs px-3" onClick={onHire}>
              <Plus className="h-3 w-3 mr-1" /> Hire
            </Button>
            <Link to={`/vendors/${vendor.id}`}>
              <Button size="sm" variant="ghost" className="h-7 text-xs px-3 w-full">
                Profile <ChevronRight className="h-3 w-3 ml-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
