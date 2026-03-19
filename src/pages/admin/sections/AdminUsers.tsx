import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listUsers, updateUser } from "@/api/admin";
import { userTypeBadge } from "@/lib/badges";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", { search, userType: userTypeFilter, page }],
    queryFn: () => listUsers({ userType: userTypeFilter || undefined, page, limit: 20 }),
    staleTime: 30_000,
  });

  const users = data?.data?.users ?? [];
  const total = data?.data?.total ?? 0;

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Record<string, unknown> }) => updateUser(id, updates),
    onSuccess: () => {
      toast.success("User updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Update failed"),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-clash font-bold text-glow">Users</h1>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-10 text-sm" placeholder="Search by email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={userTypeFilter}
          onChange={e => setUserTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {["user", "organizer", "vendor", "influencer", "admin"].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted-foreground">{total} total users</p>

      {isLoading && new Array(5).fill(null).map((_, i) => <div key={`skeleton-${i}`} className="glass-card p-3 rounded-xl animate-pulse h-16" />)}

      <div className="space-y-2">
        {users.map((u: any) => (
          <Card key={u.id} className="glass-card">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.name ?? "—"} · Joined {new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-xs ${userTypeBadge[u.userType] ?? ""}`}>{u.userType}</Badge>
                {u.isActive ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-500/30 text-red-400"
                    onClick={() => updateMutation.mutate({ id: u.id, updates: { isActive: false } })}>
                    Deactivate
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs border-green-500/30 text-green-400"
                    onClick={() => updateMutation.mutate({ id: u.id, updates: { isActive: true } })}>
                    Reactivate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
