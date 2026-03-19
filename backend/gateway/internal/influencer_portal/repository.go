package influencer_portal

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db      *pgxpool.Pool
	baseURL string // e.g. https://bukr.app — for building referral URLs
}

func NewRepository(db *pgxpool.Pool, baseURL string) *Repository {
	return &Repository{db: db, baseURL: baseURL}
}

// GetProfileByUserID fetches the influencer portal profile for a logged-in user.
// Joins influencers → users to get name/email from the user account.
func (r *Repository) GetProfileByUserID(ctx context.Context, userID string) (*PortalProfile, error) {
	var p PortalProfile
	var payoutJSON *string

	err := r.db.QueryRow(ctx,
		`SELECT i.id::text, u.name, u.email,
		        COALESCE(i.social_handle, ''),
		        i.referral_code,
		        COALESCE(i.total_referrals, 0),
		        COALESCE(i.total_revenue, 0),
		        COALESCE(i.pending_earnings, 0),
		        COALESCE(i.total_withdrawn, 0),
		        i.payout_account::text
		 FROM influencers i
		 JOIN users u ON u.id = i.user_id
		 WHERE i.user_id = $1`,
		userID,
	).Scan(
		&p.ID, &p.Name, &p.Email, &p.SocialHandle,
		&p.ReferralCode, &p.TotalReferrals, &p.TotalRevenue,
		&p.PendingEarnings, &p.TotalWithdrawn, &payoutJSON,
	)
	if err != nil {
		return nil, err
	}

	if payoutJSON != nil && *payoutJSON != "" && *payoutJSON != "null" {
		var acct PayoutAccount
		if err := json.Unmarshal([]byte(*payoutJSON), &acct); err == nil {
			p.PayoutAccount = &acct
		}
	}
	return &p, nil
}

// GetReferralLinks returns all events this influencer is linked to,
// with per-event ticket sales and earnings computed from tickets table.
//
// Strategy: single JOIN query — avoids N+1 by aggregating in SQL.
// The influencer is linked to events via the organizer who created them
// (influencers.organizer_id → events.organizer_id) filtered by referral_code
// usage in tickets.
func (r *Repository) GetReferralLinks(ctx context.Context, influencerID string) ([]ReferralLink, error) {
	rows, err := r.db.Query(ctx,
		`SELECT
		    e.id::text,
		    e.title,
		    e.date::text,
		    i.referral_code,
		    COALESCE(i.referral_discount, 10),
		    COALESCE(COUNT(t.id), 0)        AS tickets_sold,
		    COALESCE(SUM(
		        t.total_price * (i.referral_discount / 100.0) * 0.3
		    ), 0)                            AS earnings
		 FROM influencers i
		 JOIN events e ON e.organizer_id = i.organizer_id
		 LEFT JOIN tickets t
		    ON t.event_id = e.id
		   AND t.status NOT IN ('cancelled', 'refunded')
		   AND EXISTS (
		       SELECT 1 FROM promo_codes pc
		       WHERE pc.id = t.promo_code_id
		         AND pc.code = i.referral_code
		   )
		 WHERE i.id = $1
		   AND e.status = 'active'
		 GROUP BY e.id, e.title, e.date, i.referral_code, i.referral_discount
		 ORDER BY e.date DESC`,
		influencerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []ReferralLink
	for rows.Next() {
		var l ReferralLink
		if err := rows.Scan(
			&l.EventID, &l.EventTitle, &l.EventDate,
			&l.ReferralCode, &l.DiscountPercent,
			&l.TicketsSold, &l.Earnings,
		); err != nil {
			return nil, err
		}
		l.ReferralURL = fmt.Sprintf("%s/#/events?ref=%s", r.baseURL, l.ReferralCode)
		links = append(links, l)
	}
	if links == nil {
		links = []ReferralLink{}
	}
	return links, rows.Err()
}

// GetPayoutHistory returns all payout requests for this influencer.
func (r *Repository) GetPayoutHistory(ctx context.Context, influencerID string) ([]PayoutHistoryItem, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id::text, amount, status, requested_at, processed_at, paid_at, admin_note
		 FROM influencer_payouts
		 WHERE influencer_id = $1
		 ORDER BY requested_at DESC`,
		influencerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []PayoutHistoryItem
	for rows.Next() {
		var item PayoutHistoryItem
		if err := rows.Scan(
			&item.ID, &item.Amount, &item.Status,
			&item.RequestedAt, &item.ProcessedAt, &item.PaidAt, &item.AdminNote,
		); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if items == nil {
		items = []PayoutHistoryItem{}
	}
	return items, rows.Err()
}

// RequestPayout creates a payout request and stores the bank account details.
// Uses a transaction: update payout_account + insert payout row atomically.
func (r *Repository) RequestPayout(ctx context.Context, influencerID string, req PayoutRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Verify sufficient pending earnings
	var pending float64
	if err := tx.QueryRow(ctx,
		`SELECT COALESCE(pending_earnings, 0) FROM influencers WHERE id = $1 FOR UPDATE`,
		influencerID,
	).Scan(&pending); err != nil {
		return fmt.Errorf("influencer not found")
	}
	if pending < req.Amount {
		return fmt.Errorf("insufficient pending earnings: have ₦%.0f, requested ₦%.0f", pending, req.Amount)
	}

	// Persist bank account details for future payouts
	acctJSON, _ := json.Marshal(PayoutAccount{
		BankCode:      req.BankCode,
		AccountNumber: req.AccountNumber,
		AccountName:   req.AccountName,
		BankName:      req.BankName,
	})
	if _, err := tx.Exec(ctx,
		`UPDATE influencers SET payout_account = $1 WHERE id = $2`,
		string(acctJSON), influencerID,
	); err != nil {
		return err
	}

	// Deduct from pending_earnings, add to total_withdrawn
	if _, err := tx.Exec(ctx,
		`UPDATE influencers
		 SET pending_earnings = pending_earnings - $1,
		     total_withdrawn  = total_withdrawn  + $1
		 WHERE id = $2`,
		req.Amount, influencerID,
	); err != nil {
		return err
	}

	// Insert payout request
	if _, err := tx.Exec(ctx,
		`INSERT INTO influencer_payouts (influencer_id, amount) VALUES ($1, $2)`,
		influencerID, req.Amount,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// ClaimByToken links a Bukr user account to an organizer-created influencer record.
// Called when an influencer clicks their invite link and is logged in.
func (r *Repository) ClaimByToken(ctx context.Context, token, userID string) error {
	result, err := r.db.Exec(ctx,
		`UPDATE influencers
		 SET user_id = $1, claimed_at = NOW(), invite_token = NULL
		 WHERE invite_token = $2
		   AND user_id IS NULL
		   AND claimed_at IS NULL`,
		userID, token,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("token invalid, expired, or already claimed")
	}
	return nil
}
