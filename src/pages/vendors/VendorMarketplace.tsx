import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search, MapPin, Star, BadgeCheck, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { searchVendors, VendorSearchParams } from "@/api/vendors";
import { vendorTierBadge } from "@/lib/badges";

const CATEGORIES = ["DJ", "Catering", "Photography", "Videography", "MC", "Decoration", "Security", "AV_Tech", "Makeup", "Ushers"];

export default function VendorMarketplace() {
  const [filters, setFilters] = useState<VendorSearchParams>({});
  const [cityInput, setCityInput] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | undefined>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendors", filters],
    queryFn: () => searchVendors(filters),
    staleTime: 60_000,
  });

  const vendors = data?.vendors ?? [];
  const total = data?.total ?? 0;

  const applyCategory = (cat: string) => {
    const next = activeCategory === cat ? undefined : cat;
    setActiveCategory(next);
    setFilters(f => ({ ...f, category: next }));
  };

  const applyCity = () => {
    setFilters(f => ({ ...f, city: cityInput.trim() || undefined }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-20">
      {/* Header */}
      <div className="p-4 sm:p-6 pt-8">
        <h1 className="text-2xl sm:text-3xl font-clash font-bold text-glow mb-1">Vendor Marketplace</h1>
        <p className="text-muted-foreground text-sm">
          Find the best vendors for your next event — DJ, catering, photography and more.
        </p>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 space-y-4">
        {/* City search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 h-11 text-base"
              placeholder="Filter by city (e.g. Lagos)"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyCity()}
            />
          </div>
          <Button variant="outline" className="h-11 px-4" onClick={applyCity}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => applyCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="px-4 sm:px-6 mt-6">
        {!isLoading && !isError && (
          <p className="text-xs text-muted-foreground mb-4">
            {total > 0 ? `${total} vendor${total !== 1 ? "s" : ""} found` : ""}
          </p>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {["s1","s2","s3","s4","s5","s6"].map(k => (
              <div key={k} className="glass-card p-4 rounded-xl animate-pulse h-48" />
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-2">Couldn't load vendors right now.</p>
            <p className="text-sm">Check your connection and try again.</p>
          </div>
        )}

        {!isLoading && !isError && vendors.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg font-medium mb-2">No vendors found</p>
            <p className="text-muted-foreground text-sm mb-6">
              No vendors found — but the night is young. Adjust your filters.
            </p>
            <Button variant="outline" onClick={() => { setFilters({}); setCityInput(""); setActiveCategory(undefined); }}>
              Clear filters
            </Button>
          </div>
        )}

        {!isLoading && vendors.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vendors.map((vendor: any) => (
              <Link key={vendor.id} to={`/vendors/${vendor.id}`}>
                <Card className="glass-card hover:border-primary/40 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-4 space-y-3">
                    {/* Name + badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">{vendor.businessName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{vendor.category}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {vendor.isVerified && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <BadgeCheck className="h-3.5 w-3.5" /> Verified
                          </span>
                        )}
                        <Badge variant="outline" className={`text-xs ${vendorTierBadge[vendor.tier] ?? ""}`}>
                          {vendor.tier}
                        </Badge>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{vendor.city}{vendor.servesNationwide ? " · Nationwide" : ""}</span>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{Number(vendor.bayesianRating ?? vendor.rating ?? 0).toFixed(1)}</span>
                      <span className="text-muted-foreground text-xs">({vendor.reviewCount ?? 0} reviews)</span>
                    </div>

                    {/* Stats */}
                    <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-border/30">
                      <span>{vendor.hireCount ?? 0} hires</span>
                      <span>{Math.round(Number(vendor.completionRate ?? 1) * 100)}% completion</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
