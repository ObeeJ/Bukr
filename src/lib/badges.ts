/**
 * Centralized badge color tokens — used across all pages for status/type badges.
 * Keeps visual language consistent: same status always = same color, everywhere.
 */

export const userTypeBadge: Record<string, string> = {
  admin:      "bg-red-500/20 text-red-400 border-red-500/30",
  organizer:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  vendor:     "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  influencer: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  user:       "bg-muted text-muted-foreground",
};

export const vendorTierBadge: Record<string, string> = {
  pro:      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  verified: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  free:     "bg-muted text-muted-foreground",
};

export const hireStatusBadge: Record<string, string> = {
  pending:        "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  accepted:       "bg-green-500/20 text-green-400 border-green-500/30",
  counter_offered:"bg-blue-500/20 text-blue-400 border-blue-500/30",
  declined:       "bg-red-500/20 text-red-400 border-red-500/30",
  completed:      "bg-primary/20 text-primary border-primary/30",
  disputed:       "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

export const payoutStatusBadge: Record<string, string> = {
  pending:    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paid:       "bg-green-500/20 text-green-400 border-green-500/30",
  failed:     "bg-red-500/20 text-red-400 border-red-500/30",
};

export const ticketStatusBadge: Record<string, string> = {
  valid:     "bg-green-500/20 text-green-400 border-green-500/30",
  used:      "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export const eventStatusBadge: Record<string, string> = {
  active:    "bg-green-500/20 text-green-400 border-green-500/30",
  draft:     "bg-muted text-muted-foreground",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};
