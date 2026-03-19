package credits

import "time"

// ── REQUEST DTOs ──────────────────────────────────────────────────────────────

type PurchaseRequest struct {
	PackType    string `json:"pack_type"`    // single | growth | pro_pack | annual
	CallbackURL string `json:"callback_url"` // Paystack redirect after payment
}

// ── RESPONSE DTOs ─────────────────────────────────────────────────────────────

type CreditPackResponse struct {
	ID              string    `json:"id"`
	PackType        string    `json:"pack_type"`
	CreditsTotal    int       `json:"credits_total"`    // -1 = unlimited (annual)
	CreditsUsed     int       `json:"credits_used"`
	CreditsRemaining int      `json:"credits_remaining"` // -1 = unlimited
	FeaturedTotal   int       `json:"featured_total"`
	FeaturedUsed    int       `json:"featured_used"`
	PricePaid       float64   `json:"price_paid"`
	IsActive        bool      `json:"is_active"`
	PurchasedAt     time.Time `json:"purchased_at"`
	ExpiresAt       time.Time `json:"expires_at"`
}

type MyCreditsResponse struct {
	ActivePack       *CreditPackResponse  `json:"active_pack"`        // nil if none
	CreditsRemaining int                  `json:"credits_remaining"`  // convenience
	ExpiresAt        *time.Time           `json:"expires_at"`
	History          []CreditPackResponse `json:"history"`
}

type PurchaseInitResponse struct {
	AuthorizationURL string `json:"authorization_url"`
	Reference        string `json:"reference"`
	PackType         string `json:"pack_type"`
	AmountKobo       int64  `json:"amount_kobo"`
}

// ── PACK CATALOG ──────────────────────────────────────────────────────────────
// Single source of truth. O(1) lookup. Mirrors frontend CREDIT_PLANS exactly.

type PackDef struct {
	CreditsTotal  int // -1 = unlimited
	FeaturedTotal int
	PriceNGN      int // naira
}

var packCatalog = map[string]PackDef{
	"single":   {CreditsTotal: 1, FeaturedTotal: 0, PriceNGN: 2000},
	"growth":   {CreditsTotal: 3, FeaturedTotal: 0, PriceNGN: 5000},
	"pro_pack": {CreditsTotal: 10, FeaturedTotal: 1, PriceNGN: 12000},
	"annual":   {CreditsTotal: -1, FeaturedTotal: 3, PriceNGN: 25000},
}

func GetPackDef(packType string) (PackDef, bool) {
	def, ok := packCatalog[packType]
	return def, ok
}
