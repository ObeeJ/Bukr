import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listWaitlist } from "@/api/admin";

export default function AdminWaitlist() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-waitlist", page],
    queryFn: () => listWaitlist({ page, limit: 50 }),
    staleTime: 60_000,
  });

  const entries = data?.entries ?? [];
  const total   = data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Waitlist</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Global email signups — people waiting for Bukr to launch in their area.
          </p>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <p className="text-2xl font-bold">{total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total signups</p>
          </div>
        </CardContent>
      </Card>

      {isLoading && [1,2,3,4,5].map(k => (
        <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-12" />
      ))}

      <div className="space-y-1.5">
        {entries.map((e: any) => (
          <div key={e.id} className="glass-card rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-sm">
            <span className="font-mono text-sm">{e.email}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {new Date(e.createdAt).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>

      {entries.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">No waitlist signups yet.</p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={entries.length < 50} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
