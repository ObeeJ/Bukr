import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listUsers } from "@/api/admin";
import { userTypeBadge } from "@/lib/badges";

export default function AdminOrganizers() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-organizers", page],
    queryFn: () => listUsers({ userType: "organizer", page, limit: 20 }),
    staleTime: 60_000,
  });

  const organizers = data?.data?.users ?? [];
  const total = data?.data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-clash font-bold text-glow">Organizers</h1>
      <p className="text-xs text-muted-foreground">{total} organizers</p>

      {isLoading && ["s1","s2","s3","s4","s5"].map(k => <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16" />)}

      <div className="space-y-2">
        {organizers.map((org: any) => (
          <Card key={org.id} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{org.name ?? org.email}</p>
                  <p className="text-xs text-muted-foreground">{org.email}</p>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{org.totalEvents ?? 0} events</span>
                    <span>₦{Number(org.totalRevenue ?? 0).toLocaleString()} generated</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant="outline" className={`text-xs ${userTypeBadge["organizer"]}`}>
                    organizer
                  </Badge>
                  {org.creditPackType && (
                    <span className="text-xs text-muted-foreground">{org.creditPackType}</span>
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
        <Button variant="outline" size="sm" disabled={organizers.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
