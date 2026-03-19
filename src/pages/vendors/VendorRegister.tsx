import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { registerVendor } from "@/api/vendors";

const CATEGORIES = ["DJ", "Catering", "Photography", "Videography", "MC", "Decoration", "Security", "AV_Tech", "Makeup", "Ushers", "Logistics", "Other"];

const TIERS = [
  {
    id: "commission_only",
    label: "Free Listing",
    price: "₦0 upfront",
    commission: "8% per hire",
    features: ["Listed in marketplace", "2 hire bids/month", "No badge"],
    highlight: false,
  },
  {
    id: "verified",
    label: "Verified",
    price: "₦2,000 one-time",
    commission: "5% per hire",
    features: ["Verification badge", "10 bids/month", "Portfolio gallery", "Calendar", "Reviews"],
    highlight: true,
  },
];

export default function VendorRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    businessName: "",
    category: "",
    bio: "",
    location: "",
    city: "",
    servesNationwide: false,
    portfolioUrls: [] as string[],
    commissionOnly: true,
  });

  const set = (key: keyof typeof form, val: unknown) => setForm(f => ({ ...f, [key]: val }));

  const mutation = useMutation({
    mutationFn: () => registerVendor(form),
    onSuccess: () => {
      toast.success("You're on Bukr!", { description: "Your vendor profile is live. Organizers can now find you." });
      navigate("/vendor-dashboard");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? "Couldn't create your profile. Try again.";
      toast.error("Registration failed", { description: msg });
    },
  });

  const canAdvance1 = form.businessName && form.category && form.location && form.city;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24">
      <div className="max-w-lg mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-clash font-bold text-glow">Join as a Vendor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your next event booking is already looking for you.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>

        {/* Step 1 — Basic info */}
        {step === 1 && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold">Basic Information</h2>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Business name</label>
              <Input className="h-11 text-base" placeholder="e.g. DJ Khalid Productions" value={form.businessName} onChange={e => set("businessName", e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => set("category", cat)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.category === cat ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Bio (optional)</label>
              <Textarea className="text-base" placeholder="Tell organizers what you do and why you're great..." rows={3} value={form.bio} onChange={e => set("bio", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">City</label>
                <Input className="h-11 text-base" placeholder="Lagos" value={form.city} onChange={e => set("city", e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Full location</label>
                <Input className="h-11 text-base" placeholder="Lekki Phase 1, Lagos" value={form.location} onChange={e => set("location", e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.servesNationwide} onChange={e => set("servesNationwide", e.target.checked)} className="rounded" />
              <span className="text-sm">I'm willing to travel / serve nationwide</span>
            </label>
            <Button variant="glow" className="w-full" disabled={!canAdvance1} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        )}

        {/* Step 2 — Tier selection */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold">Choose Your Tier</h2>
            {TIERS.map(tier => (
              <button
                key={tier.id}
                onClick={() => set("commissionOnly", tier.id === "commission_only")}
                className={`w-full text-left glass-card rounded-2xl p-5 border-2 transition-all ${
                  (tier.id === "commission_only") === form.commissionOnly
                    ? "border-primary"
                    : "border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{tier.label}</p>
                      {tier.highlight && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Recommended</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{tier.price} · {tier.commission}</p>
                    <ul className="mt-2 space-y-1">
                      {tier.features.map(f => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center ${
                    (tier.id === "commission_only") === form.commissionOnly ? "border-primary bg-primary" : "border-border"
                  }`}>
                    {(tier.id === "commission_only") === form.commissionOnly && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            ))}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button variant="glow" className="flex-1" onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {/* Step 3 — Confirm */}
        {step === 3 && (
          <div className="glass-card rounded-2xl p-5 space-y-5">
            <h2 className="font-semibold">Confirm & Publish</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Business name</span><span className="font-medium">{form.businessName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-medium">{form.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">City</span><span className="font-medium">{form.city}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><span className="font-medium">{form.commissionOnly ? "Free (8% commission)" : "Verified (5% commission)"}</span></div>
            </div>
            {!form.commissionOnly && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-sm text-muted-foreground">
                You'll be redirected to pay the ₦2,000 Verified fee after confirming. Your profile goes live immediately.
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button variant="glow" className="flex-1" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                {mutation.isPending ? "Creating..." : "Go Live"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
