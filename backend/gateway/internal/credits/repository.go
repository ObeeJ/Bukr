package credits

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const selectFields = `
	id::text, pack_type, credits_total, credits_used,
	featured_total, featured_used, price_paid,
	is_active, purchased_at, expires_at`

func scanPack(scan func(...any) error) (CreditPackResponse, error) {
	var p CreditPackResponse
	err := scan(
		&p.ID, &p.PackType, &p.CreditsTotal, &p.CreditsUsed,
		&p.FeaturedTotal, &p.FeaturedUsed, &p.PricePaid,
		&p.IsActive, &p.PurchasedAt, &p.ExpiresAt,
	)
	if err != nil {
		return p, err
	}
	// Compute remaining: -1 means unlimited (annual pack)
	if p.CreditsTotal == -1 {
		p.CreditsRemaining = -1
	} else {
		p.CreditsRemaining = p.CreditsTotal - p.CreditsUsed
	}
	return p, nil
}

// GetMyCredits returns the active pack + full history for an organizer.
// Uses a single query ordered by purchased_at DESC — active pack is first row
// where is_active=true and not expired.
func (r *Repository) GetMyCredits(ctx context.Context, organizerID string) (MyCreditsResponse, error) {
	rows, err := r.db.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM organizer_credit_packs
		 WHERE organizer_id = $1
		 ORDER BY is_active DESC, purchased_at DESC`, selectFields),
		organizerID,
	)
	if err != nil {
		return MyCreditsResponse{}, err
	}
	defer rows.Close()

	var resp MyCreditsResponse
	resp.History = []CreditPackResponse{}

	for rows.Next() {
		pack, err := scanPack(rows.Scan)
		if err != nil {
			return resp, err
		}
		resp.History = append(resp.History, pack)

		// First active, non-expired pack becomes the active pack
		if resp.ActivePack == nil && pack.IsActive && pack.ExpiresAt.After(time.Now()) {
			cp := pack
			resp.ActivePack = &cp
			resp.CreditsRemaining = pack.CreditsRemaining
			exp := pack.ExpiresAt
			resp.ExpiresAt = &exp
		}
	}
	return resp, rows.Err()
}

// CreatePack inserts a new credit pack record with pending payment_ref.
// Called before Paystack redirect — pack is inactive until webhook confirms.
func (r *Repository) CreatePack(
	ctx context.Context,
	organizerID, packType, paymentRef string,
	def PackDef,
) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`INSERT INTO organizer_credit_packs
		 (organizer_id, pack_type, credits_total, featured_total, price_paid, payment_ref, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, false)
		 RETURNING id::text`,
		organizerID, packType, def.CreditsTotal, def.FeaturedTotal,
		float64(def.PriceNGN), paymentRef,
	).Scan(&id)
	return id, err
}

// ActivatePack marks a pack as active once payment is confirmed by webhook.
// Uses payment_ref as the lookup key — idempotent via the is_active check.
func (r *Repository) ActivatePack(ctx context.Context, paymentRef string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE organizer_credit_packs
		 SET is_active = true
		 WHERE payment_ref = $1 AND is_active = false`,
		paymentRef,
	)
	return err
}

// ConsumeCredit decrements credits_used by 1 for the organizer's active pack.
// Returns error if no active pack with remaining credits exists.
// Uses SELECT FOR UPDATE inside a transaction to prevent race conditions —
// same pattern as ticket purchase to avoid double-spend.
func (r *Repository) ConsumeCredit(ctx context.Context, organizerID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var packID string
	var creditsTotal, creditsUsed int
	err = tx.QueryRow(ctx,
		`SELECT id::text, credits_total, credits_used
		 FROM organizer_credit_packs
		 WHERE organizer_id = $1
		   AND is_active = true
		   AND expires_at > NOW()
		   AND (credits_total = -1 OR credits_used < credits_total)
		 ORDER BY expires_at ASC
		 LIMIT 1
		 FOR UPDATE`,
		organizerID,
	).Scan(&packID, &creditsTotal, &creditsUsed)
	if err != nil {
		return fmt.Errorf("no active credit pack with remaining credits")
	}

	// Annual pack (credits_total = -1) never increments used count
	if creditsTotal != -1 {
		_, err = tx.Exec(ctx,
			`UPDATE organizer_credit_packs SET credits_used = credits_used + 1 WHERE id = $1`,
			packID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
