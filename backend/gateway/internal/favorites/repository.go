package favorites

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

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

func (r *Repository) Add(ctx context.Context, userID, eventID string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO favorites (user_id, event_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, event_id) DO NOTHING`, userID, eventID)
	return err
}

func (r *Repository) Remove(ctx context.Context, userID, eventID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM favorites WHERE user_id = $1 AND event_id = $2`, userID, eventID)
	return err
}

func (r *Repository) IsFavorited(ctx context.Context, userID, eventID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND event_id = $2)`,
		userID, eventID).Scan(&exists)
	return exists, err
}
