/**
 * REPOSITORY LAYER - Favorites Database Operations
 * 
 * Favorites Repository: The bookmark vault - storing saved events
 * 
 * Architecture Layer: Repository (Layer 5)
 * Dependencies: Database (PostgreSQL via pgx)
 * Responsibility: CRUD operations for favorites table
 * 
 * Database Table: favorites
 * Columns:
 * - user_id: Foreign key to users
 * - event_id: Foreign key to events
 * - created_at: When favorited
 * Unique constraint: (user_id, event_id)
 * 
 * Operations are idempotent:
 * - Add uses ON CONFLICT DO NOTHING
 * - Remove doesn't error if not exists
 */

package favorites

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

/**
 * Repository: Favorites data access
 */
type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

/**
 * List: Get user's favorited events with full details
 * 
 * Joins favorites -> events -> users
 * Returns event details (not just IDs)
 * Ordered by most recently favorited
 */
func (r *Repository) List(ctx context.Context, userID string) ([]FavoriteEventResponse, error) {
	rows, err := r.db.Query(ctx, `
		SELECT e.id::text, e.title, e.date::text, e.time::text, e.location,
			   e.price, e.currency, e.category, e.emoji, e.event_key,
			   e.thumbnail_url, e.available_tickets, u.name
		FROM favorites f
		JOIN events e ON f.event_id = e.id
		JOIN users u ON e.organizer_id = u.id
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Scan all favorited events
	var events []FavoriteEventResponse
	for rows.Next() {
		var ev FavoriteEventResponse
		if err := rows.Scan(
			&ev.ID, &ev.Title, &ev.Date, &ev.Time, &ev.Location,
			&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
			&ev.ThumbnailURL, &ev.AvailableTickets, &ev.OrganizerName,
		); err != nil {
			return nil, err
		}
		events = append(events, ev)
	}
	return events, nil
}

/**
 * Add: Add event to favorites
 * 
 * Idempotent: ON CONFLICT DO NOTHING
 * Adding twice has same effect as once
 */
func (r *Repository) Add(ctx context.Context, userID, eventID string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO favorites (user_id, event_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, event_id) DO NOTHING`, userID, eventID)
	return err
}

/**
 * Remove: Remove event from favorites
 * 
 * Idempotent: no error if favorite doesn't exist
 * Removing twice has same effect as once
 */
func (r *Repository) Remove(ctx context.Context, userID, eventID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM favorites WHERE user_id = $1 AND event_id = $2`, userID, eventID)
	return err
}

/**
 * IsFavorited: Check if event is favorited
 * 
 * Uses EXISTS for efficient boolean check
 * Returns false if not favorited (not error)
 */
func (r *Repository) IsFavorited(ctx context.Context, userID, eventID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND event_id = $2)`,
		userID, eventID).Scan(&exists)
	return exists, err
}
