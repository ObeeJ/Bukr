package influencer_portal

import "time"

// ── RESPONSE DTOs ─────────────────────────────────────────────────────────────

// PortalProfile is what the influencer sees on their dashboard.
// Aggregated from the influencers table joined to their user account.
type PortalProfile struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Email           string   `json:"email"`
	SocialHandle    string   `json:"social_handle"`
	ReferralCode    string   `json:"referral_code"`
	TotalReferrals  int      `json:"total_referrals"`
	TotalRevenue    float64  `json:"total_revenue"`
	PendingEarnings float64  `json:"pending_earnings"`
	TotalWithdrawn  float64  `json:"total_withdrawn"`
	PayoutAccount   *PayoutAccount `json:"payout_account"` // nil if not set
}

// PayoutAccount mirrors the JSONB shape stored in influencers.payout_account
type PayoutAccount struct {
	BankCode      string `json:"bank_code"`
	AccountNumber string `json:"account_number"`
	AccountName   string `json:"account_name"`
	BankName      string `json:"bank_name"`
}

// ReferralLink is one event the influencer is linked to.
type ReferralLink struct {
	EventID         string  `json:"event_id"`
	EventTitle      string  `json:"event_title"`
	EventDate       string  `json:"event_date"`
	ReferralURL     string  `json:"referral_url"`   // full shareable URL
	ReferralCode    string  `json:"referral_code"`
	DiscountPercent float64 `json:"discount_percent"`
	TicketsSold     int     `json:"tickets_sold"`
	Earnings        float64 `json:"earnings"`
}

type LinksResponse struct {
	Links []ReferralLink `json:"links"`
}

// PayoutHistoryItem is one payout request.
type PayoutHistoryItem struct {
	ID          string     `json:"id"`
	Amount      float64    `json:"amount"`
	Status      string     `json:"status"`
	RequestedAt time.Time  `json:"requested_at"`
	ProcessedAt *time.Time `json:"processed_at"`
	PaidAt      *time.Time `json:"paid_at"`
	AdminNote   *string    `json:"admin_note"`
}

// ── REQUEST DTOs ──────────────────────────────────────────────────────────────

type PayoutRequest struct {
	Amount        float64 `json:"amount"`         // minimum 5000
	BankCode      string  `json:"bank_code"`
	AccountNumber string  `json:"account_number"`
	AccountName   string  `json:"account_name"`
	BankName      string  `json:"bank_name"`
}

type ClaimRequest struct {
	Token string `json:"token"`
}
