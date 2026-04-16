import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listUsers, updateUser, searchUsers } from "@/api/admin";
import { userTypeBadge } from "@/lib/badges";

const USER_TYPES = ["user", "organizer", "vendor", "influencer", "admin"];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  // Debounce — avoid a query on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const isSearching = debouncedSearch.length >= 2;

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["admin-users", { userType: userTypeFilter, page }],
    queryFn: () => listUsers({ userType: userTypeFilter || undefined, page, limit: 20 }),
    staleTime: 30_000,
    enabled: !isSearching,
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["admin-users-search", debouncedSearch],
    queryFn: () => searchUsers(debouncedSearch),
    staleTime: 30_000,
    enabled: isSearching,
  });

  const isLoading = isSearching ? searchLoading : listLoading;
  const users = isSearching ? (searchData?.users ?? []) : (listData?.users ?? []);
  const total = isSearching ? (searchData?.total ?? 0) : (listData?.total ?? 0);

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

      {/* Search + type filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 h-10 text-sm"
            placeholder="Search by email or name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="h-10 px-3 rounded-md border border-border bg-background text-sm"
          value={userTypeFilter}
          onChange={e => { setUserTypeFilter(e.target.value); setPage(1); }}
          disabled={isSearching}
        >
          <option value="">All types</option>
          {USER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <p className="text-xs text-muted-foreground">{total} {isSearching ? "results" : "total users"}</p>

      {isLoading && new Array(5).fill(null).map((_, i) => <div key={`skeleton-${i}`} className="glass-card p-3 rounded-xl animate-pulse h-16" />)}

      <div className="space-y-2">
        {users.map((u: any) => (
          <Card key={u.id} className="glass-card">
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.name ?? "—"} · Joined {new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-xs ${userTypeBadge[u.userType] ?? ""}`}>{u.userType}</Badge>

                {/* Role change — backend PATCH /admin/users/:id supports { user_type } */}
                <Select
                  value={u.userType}
                  onValueChange={val => updateMutation.mutate({ id: u.id, updates: { userType: val } })}
                >
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

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

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={users.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
