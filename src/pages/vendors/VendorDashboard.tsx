import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Star, CheckCircle, XCircle, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyVendorHires, respondHire, setAvailability } from "@/api/vendors";
import { hireStatusBadge } from "@/lib/badges";

export default function VendorDashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const { data: hiresData, isLoading } = useQuery({
    queryKey: ["vendor-hires"],
    queryFn: getMyVendorHires,
    staleTime: 30_000,
    retry: false,
    throwOnError: false,
    meta: { onError: () => navigate("/vendor/register", { replace: true }) },
  });

  // Redirect if no vendor profile (API returns 404)
  if (!isLoading && !hiresData) {
    navigate("/vendor/register", { replace: true });
    return null;
  }

  const hires = hiresData?.hires ?? [];
  const pending = hires.filter((h: any) => h.status === "pending");
  const active = hires.filter((h: any) => ["accepted", "counter_offered"].includes(h.status));
  const completed = hires.filter((h: any) => h.status === "completed");

  const respondMutation = useMutation({
    mutationFn: ({ hireId, accept, counterAmount }: { hireId: string; accept: boolean; counterAmount?: number }) =>
      respondHire(hireId, { accept, counterAmount }),
    onSuccess: (_, vars) => {
      toast.success(vars.accept ? "Hire accepted!" : "Hire declined");
      qc.invalidateQueries({ queryKey: ["vendor-hires"] });
    },
    onError: () => toast.error("Couldn't update hire", { description: "Something went wrong on our end. Try again in a moment." }),
  });

  const availMutation = useMutation({
    mutationFn: (isBooked: boolean) => setAvailability({ dates: selectedDates, isBooked }),
    onSuccess: () => {
      toast.success("Availability updated");
      setSelectedDates([]);
    },
    onError: () => toast.error("Couldn't update availability"),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Vendor Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your hires, calendar, and profile.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: pending.length, icon: <Calendar className="h-4 w-4" /> },
            { label: "Active", value: active.length, icon: <CheckCircle className="h-4 w-4" /> },
            { label: "Completed", value: completed.length, icon: <Star className="h-4 w-4" /> },
          ].map(stat => (
            <Card key={stat.label} className="glass-card">
              <CardContent className="p-3 text-center">
                <div className="flex justify-center text-primary mb-1">{stat.icon}</div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="hires">
          <TabsList className="glass-card w-full">
            <TabsTrigger value="hires" className="flex-1">Hires</TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1">Calendar</TabsTrigger>
          </TabsList>

          {/* Hires tab */}
          <TabsContent value="hires" className="mt-4 space-y-3">
            {isLoading && ["s1","s2","s3"].map(k => (
              <div key={k} className="glass-card p-4 rounded-xl animate-pulse h-28" />
            ))}

            {!isLoading && hires.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-1">No hire requests yet.</p>
                <p className="text-sm">Complete your profile and stay active — organizers will find you.</p>
              </div>
            )}

            {hires.map((hire: any) => (
              <Card key={hire.id} className="glass-card">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Event #{hire.eventId?.slice(-8)}</p>
                      {hire.proposedAmount && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <DollarSign className="h-3 w-3" />
                          Budget: ₦{Number(hire.proposedAmount).toLocaleString()}
                        </p>
                      )}
                      {hire.message && <p className="text-xs text-muted-foreground mt-1 italic">"{hire.message}"</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${hireStatusBadge[hire.status] ?? ""}`}>
                      {hire.status.replace("_", " ")}
                    </Badge>
                  </div>

                  {hire.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="glow"
                        className="flex-1 h-9"
                        disabled={respondMutation.isPending}
                        onClick={() => respondMutation.mutate({ hireId: hire.id, accept: true })}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-9 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        disabled={respondMutation.isPending}
                        onClick={() => respondMutation.mutate({ hireId: hire.id, accept: false })}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Calendar tab */}
          <TabsContent value="calendar" className="mt-4">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base font-medium">Mark Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select dates and mark them as available or blocked so organizers know when you're free.
                </p>
                <Input
                  type="date"
                  className="h-11 text-base"
                  onChange={e => {
                    const d = e.target.value;
                    if (d && !selectedDates.includes(d)) setSelectedDates(prev => [...prev, d]);
                  }}
                />
                {selectedDates.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedDates.map(d => (
                        <Badge key={d} variant="outline" className="cursor-pointer" onClick={() => setSelectedDates(prev => prev.filter(x => x !== d))}>
                          {d} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="glow"
                        className="flex-1"
                        disabled={availMutation.isPending}
                        onClick={() => availMutation.mutate(false)}
                      >
                        Mark Available
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-400"
                        disabled={availMutation.isPending}
                        onClick={() => availMutation.mutate(true)}
                      >
                        Mark Booked
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
