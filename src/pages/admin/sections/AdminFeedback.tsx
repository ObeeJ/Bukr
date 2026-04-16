import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, ThumbsUp, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAdminFeedback } from "@/api/admin";

const JOURNEY_LABELS: Record<string, string> = {
  ticket_purchased:    "Ticket Purchase",
  event_created:       "Event Created",
  vendor_registered:   "Vendor Register",
  payout_requested:    "Payout Request",
  scan_session_ended:  "Scan Session",
};

const RATING_COLORS = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-lime-400", "text-green-400"];

export default function AdminFeedback() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-feedback", page],
    queryFn: () => getAdminFeedback({ page, limit: 25 }),
    staleTime: 60_000,
  });

  const entries   = data?.entries ?? [];
  const agg       = data?.aggregate ?? {};
  const byJourney = agg.byJourney ?? [];
  const byType    = agg.byUserType ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Feedback</h1>
          <p className="text-muted-foreground text-sm mt-0.5">NPS scores and user satisfaction across all journeys.</p>
        </div>
      </div>

      {/* Aggregate KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="glass-card">
          <CardContent className="p-3">
            <ThumbsUp className="h-4 w-4 text-green-400 mb-1" />
            {isLoading
              ? <div className="h-6 bg-muted animate-pulse rounded w-16" />
              : <p className="text-lg font-bold">{Number(agg.recommendRate ?? 0).toFixed(1)}%</p>
            }
            <p className="text-xs text-muted-foreground">Recommend Rate</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3">
            <Star className="h-4 w-4 text-yellow-400 mb-1" />
            {isLoading
              ? <div className="h-6 bg-muted animate-pulse rounded w-16" />
              : <p className="text-lg font-bold">{Number(agg.avgRating ?? 0).toFixed(2)}<span className="text-xs text-muted-foreground">/5</span></p>
            }
            <p className="text-xs text-muted-foreground">Avg Rating</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-3">
            <MessageSquare className="h-4 w-4 text-blue-400 mb-1" />
            {isLoading
              ? <div className="h-6 bg-muted animate-pulse rounded w-16" />
              : <p className="text-lg font-bold">{agg.total ?? 0}</p>
            }
            <p className="text-xs text-muted-foreground">Total Responses</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by journey */}
      {byJourney.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Journey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byJourney.map((j: any) => (
              <div key={j.journey} className="flex items-center justify-between gap-3 py-1 border-b border-border/20 last:border-0">
                <span className="text-sm">{JOURNEY_LABELS[j.journey] ?? j.journey}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{j.count} responses</span>
                  <span className={`font-medium ${RATING_COLORS[Math.round(j.avgRating)] ?? ""}`}>
                    ★ {Number(j.avgRating).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Breakdown by user type */}
      {byType.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By User Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byType.map((t: any) => (
              <div key={t.userType} className="flex items-center justify-between gap-3 py-1 border-b border-border/20 last:border-0">
                <span className="text-sm capitalize">{t.userType}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t.count} responses</span>
                  <span className={`font-medium ${RATING_COLORS[Math.round(t.avgRating)] ?? ""}`}>
                    ★ {Number(t.avgRating).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Raw entries */}
      <div>
        <h2 className="font-semibold mb-3">Recent Responses</h2>
        {isLoading && [1,2,3,4,5].map(k => (
          <div key={k} className="glass-card p-3 rounded-xl animate-pulse h-16 mb-2" />
        ))}
        <div className="space-y-2">
          {entries.map((e: any) => (
            <Card key={e.id} className="glass-card">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{JOURNEY_LABELS[e.journey] ?? e.journey}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{e.userType}</Badge>
                      <span className={`text-xs font-bold ${RATING_COLORS[e.rating] ?? ""}`}>★ {e.rating}/5</span>
                      {e.recommend && <span className="text-xs text-green-400">👍 Recommends</span>}
                    </div>
                    {e.comment && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{e.comment}"</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {entries.length === 0 && !isLoading && (
        <p className="text-center text-sm text-muted-foreground py-12">No feedback yet.</p>
      )}

      <div className="flex justify-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
        <span className="text-sm text-muted-foreground self-center">Page {page}</span>
        <Button variant="outline" size="sm" disabled={entries.length < 25} onClick={() => setPage(p => p + 1)}>Next</Button>
      </div>
    </div>
  );
}
