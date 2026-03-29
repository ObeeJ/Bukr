import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { listDisputes, resolveDispute } from "@/api/admin";

const RESOLUTIONS = [
  { value: "organizer_wins", label: "Organizer Wins — refund organizer" },
  { value: "vendor_wins",    label: "Vendor Wins — release to vendor" },
  { value: "split",          label: "Split — divide agreed amount" },
];

export default function AdminDisputes() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState("organizer_wins");
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-disputes", page],
    queryFn: () => listDisputes({ page, limit: 20 }),
    staleTime: 30_000,
  });

  const disputes = data?.data?.disputes ?? [];
  const total    = data?.data?.total ?? 0;

  const resolveMutation = useMutation({
    mutationFn: () => resolveDispute(selected.id, { resolution, note }),
    onSuccess: () => {
      toast.success("Dispute resolved");
      setSelected(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: () => toast.error("Resolution failed"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Disputes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Vendor hire disputes awaiting admin resolution.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{total} open disputes</p>

      {isLoading && [1,2,3,4,5].map(k => (
        <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-20" />
      ))}

      <div className="space-y-2">
        {disputes.map((d: any) => (
          <Card key={d.id} className="glass-card border-yellow-500/15">
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{d.eventTitle || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Vendor: {d.vendorName} · Organizer: {d.organizerEmail}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Amount: <span className="text-foreground font-medium">₦{Number(d.amount).toLocaleString()}</span>
                  {" · "}{new Date(d.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">disputed</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { setSelected(d); setResolution("organizer_wins"); setNote(""); }}
                >
                  Resolve
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {disputes.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">
          No open disputes. All clear.
        </p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={disputes.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>

      {/* Resolution sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Resolve Dispute</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="mt-4 space-y-4">
              <div className="glass-card p-3 rounded-lg text-sm space-y-1">
                <p><span className="text-muted-foreground">Event:</span> {selected.eventTitle}</p>
                <p><span className="text-muted-foreground">Vendor:</span> {selected.vendorName}</p>
                <p><span className="text-muted-foreground">Amount:</span> ₦{Number(selected.amount).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Resolution</p>
                {RESOLUTIONS.map(r => (
                  <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="resolution"
                      value={r.value}
                      checked={resolution === r.value}
                      onChange={() => setResolution(r.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium">Admin Note</p>
                <textarea
                  className="w-full h-24 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none outline-none focus:border-primary/50"
                  placeholder="Reason for resolution..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
          )}

          <SheetFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setSelected(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="glow"
              className="flex-1"
              disabled={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate()}
            >
              Confirm Resolution
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
