package invites

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

// BulkCreate inserts multiple invite rows in a single transaction.
// Rows that violate the (event_id, email) unique constraint are skipped (ON CONFLICT DO NOTHING).
// Returns the count of actually inserted rows.
func (r *Repository) BulkCreate(ctx context.Context, eventID string, guests []GuestEntry) (int, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback(ctx)

	inserted := 0
	for _, g := range guests {
		tt := g.TicketType
		if tt == "" {
			tt = "General Admission"
		}
		tag, err := tx.Exec(ctx,
			`INSERT INTO event_invites (event_id, email, name, ticket_type)
			 VALUES ($1::uuid, $2, $3, $4)
			 ON CONFLICT ON CONSTRAINT uq_invite_event_email DO NOTHING`,
			eventID, g.Email, g.Name, tt,
		)
		if err != nil {
			return 0, fmt.Errorf("insert invite for %s: %w", g.Email, err)
		}
		inserted += int(tag.RowsAffected())
	}

	return inserted, tx.Commit(ctx)
}

// ListByEvent returns all invites for an event ordered by created_at DESC.
// Used by the organizer dashboard — no pagination needed at typical wedding scale.
func (r *Repository) ListByEvent(ctx context.Context, eventID string) ([]Invite, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id::text, event_id::text, email, name, ticket_type,
		        token, status, redeemed_by::text, redeemed_at,
		        referred_by_invite_id::text, sent_at, created_at
		 FROM event_invites
		 WHERE event_id = $1::uuid
		 ORDER BY created_at DESC`,
		eventID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Invite
	for rows.Next() {
		var inv Invite
		if err := rows.Scan(
			&inv.ID, &inv.EventID, &inv.Email, &inv.Name, &inv.TicketType,
			&inv.Token, &inv.Status, &inv.RedeemedBy, &inv.RedeemedAt,
			&inv.ReferredByInviteID, &inv.SentAt, &inv.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

// GetByToken fetches a single invite by its token — O(1) via unique index.
// This is the hot path: called on every invite-link tap.
func (r *Repository) GetByToken(ctx context.Context, token string) (*Invite, error) {
	var inv Invite
	err := r.db.QueryRow(ctx,
		`SELECT id::text, event_id::text, email, name, ticket_type,
		        token, status, redeemed_by::text, redeemed_at,
		        referred_by_invite_id::text, sent_at, created_at
		 FROM event_invites
		 WHERE token = $1`,
		token,
	).Scan(
		&inv.ID, &inv.EventID, &inv.Email, &inv.Name, &inv.TicketType,
		&inv.Token, &inv.Status, &inv.RedeemedBy, &inv.RedeemedAt,
		&inv.ReferredByInviteID, &inv.SentAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

// GetPendingByEventEmail checks if an authenticated user's email has a valid
// (pending or sent) invite for a given event — O(1) via composite index.
// This is the identity gate called before ticket purchase/claim.
func (r *Repository) GetPendingByEventEmail(ctx context.Context, eventID, email string) (*Invite, error) {
	var inv Invite
	err := r.db.QueryRow(ctx,
		`SELECT id::text, event_id::text, email, name, ticket_type,
		        token, status, redeemed_by::text, redeemed_at,
		        referred_by_invite_id::text, sent_at, created_at
		 FROM event_invites
		 WHERE event_id = $1::uuid
		   AND email    = $2
		   AND status   IN ('pending', 'sent')`,
		eventID, email,
	).Scan(
		&inv.ID, &inv.EventID, &inv.Email, &inv.Name, &inv.TicketType,
		&inv.Token, &inv.Status, &inv.RedeemedBy, &inv.RedeemedAt,
		&inv.ReferredByInviteID, &inv.SentAt, &inv.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

// Redeem atomically marks an invite as redeemed.
// Uses SELECT FOR UPDATE to prevent two concurrent requests redeeming the same token.
// Returns error if the invite is not in a redeemable state.
func (r *Repository) Redeem(ctx context.Context, inviteID, userID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var status string
	err = tx.QueryRow(ctx,
		`SELECT status FROM event_invites WHERE id = $1::uuid FOR UPDATE`,
		inviteID,
	).Scan(&status)
	if err != nil {
		return fmt.Errorf("invite not found")
	}
	if status != "pending" && status != "sent" {
		return fmt.Errorf("invite already %s", status)
	}

	_, err = tx.Exec(ctx,
		`UPDATE event_invites
		 SET status = 'redeemed', redeemed_by = $2::uuid, redeemed_at = NOW()
		 WHERE id = $1::uuid`,
		inviteID, userID,
	)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// Revoke sets an invite to revoked. Only works on pending/sent invites.
// Organizer-only action.
func (r *Repository) Revoke(ctx context.Context, inviteID, eventID string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE event_invites
		 SET status = 'revoked', revoked_at = NOW()
		 WHERE id = $1::uuid AND event_id = $2::uuid AND status IN ('pending', 'sent')`,
		inviteID, eventID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("invite not found or already redeemed/revoked")
	}
	return nil
}

// MarkSent updates status to 'sent' and records sent_at timestamp.
// Called by the mailer after successful email delivery.
func (r *Repository) MarkSent(ctx context.Context, inviteID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE event_invites SET status = 'sent', sent_at = NOW() WHERE id = $1::uuid`,
		inviteID,
	)
	return err
}

// ExpireStale marks pending/sent invites as expired when the RSVP deadline passes.
// Called by the notification worker on a schedule.
// Uses the event's rsvp_deadline (or event start time as fallback).
func (r *Repository) ExpireStale(ctx context.Context) (int64, error) {
	tag, err := r.db.Exec(ctx,
		`UPDATE event_invites ei
		 SET status = 'expired'
		 FROM events e
		 WHERE ei.event_id = e.id
		   AND ei.status IN ('pending', 'sent')
		   AND COALESCE(e.rsvp_deadline, (e.date + e.time)::timestamptz) < NOW()`,
	)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// GetEventAccessMode returns the access_mode for an event — single indexed read.
// Called by the booking gate middleware.
func (r *Repository) GetEventAccessMode(ctx context.Context, eventID string) (string, error) {
	var mode string
	err := r.db.QueryRow(ctx,
		`SELECT access_mode FROM events WHERE id = $1::uuid`,
		eventID,
	).Scan(&mode)
	return mode, err
}

// GetUnsentByEvent returns all pending invites that haven't been emailed yet.
// Used by the notification worker to dispatch invite emails in batches.
func (r *Repository) GetUnsentByEvent(ctx context.Context, eventID string) ([]Invite, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id::text, event_id::text, email, name, ticket_type,
		        token, status, redeemed_by::text, redeemed_at,
		        referred_by_invite_id::text, sent_at, created_at
		 FROM event_invites
		 WHERE event_id = $1::uuid AND status = 'pending'
		 ORDER BY created_at ASC`,
		eventID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Invite
	for rows.Next() {
		var inv Invite
		if err := rows.Scan(
			&inv.ID, &inv.EventID, &inv.Email, &inv.Name, &inv.TicketType,
			&inv.Token, &inv.Status, &inv.RedeemedBy, &inv.RedeemedAt,
			&inv.ReferredByInviteID, &inv.SentAt, &inv.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, inv)
	}
	return out, rows.Err()
}

// CreateReward inserts a reward row for a referral.
// ON CONFLICT DO NOTHING makes it idempotent — safe to call multiple times.
func (r *Repository) CreateReward(ctx context.Context, rewardedUserID, sourceInviteID, rewardType string, discountPct int) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO invite_referral_rewards
		    (rewarded_user_id, source_invite_id, reward_type, discount_pct)
		 VALUES ($1::uuid, $2::uuid, $3, $4)
		 ON CONFLICT ON CONSTRAINT uq_reward_per_invite DO NOTHING`,
		rewardedUserID, sourceInviteID, rewardType, discountPct,
	)
	return err
}

// GetUnusedReward returns the first unapplied reward for a user, if any.
// Called at checkout / event creation to apply the discount.
func (r *Repository) GetUnusedReward(ctx context.Context, userID string) (*RewardRow, error) {
	var rw RewardRow
	err := r.db.QueryRow(ctx,
		`SELECT id::text, reward_type, discount_pct, expires_at
		 FROM invite_referral_rewards
		 WHERE rewarded_user_id = $1::uuid
		   AND applied_at IS NULL
		   AND expires_at > NOW()
		 ORDER BY created_at ASC
		 LIMIT 1`,
		userID,
	).Scan(&rw.ID, &rw.RewardType, &rw.DiscountPct, &rw.ExpiresAt)
	if err != nil {
		return nil, err
	}
	return &rw, nil
}

// ApplyReward marks a reward as consumed.
func (r *Repository) ApplyReward(ctx context.Context, rewardID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE invite_referral_rewards SET applied_at = NOW() WHERE id = $1::uuid`,
		rewardID,
	)
	return err
}

// SetEventAccessMode updates the access_mode (and optional rsvp_deadline) for an event.
// Organizer-only. Ownership is verified in the handler before this is called.
func (r *Repository) SetEventAccessMode(ctx context.Context, eventID, mode string, deadline *time.Time) error {
	_, err := r.db.Exec(ctx,
		`UPDATE events SET access_mode = $2, rsvp_deadline = $3 WHERE id = $1::uuid`,
		eventID, mode, deadline,
	)
	return err
}

// ── Internal types ────────────────────────────────────────────────────────────

// RewardRow is the minimal projection used by GetUnusedReward.
type RewardRow struct {
	ID          string
	RewardType  string
	DiscountPct int
	ExpiresAt   time.Time
}
