package events

import (
	"context"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const baseSelectFields = `
	e.id::text, e.organizer_id::text, e.title, e.description,
	e.date::text, e.time::text, e.end_date::text, e.location,
	e.price, e.currency, e.category, e.emoji, e.event_key,
	e.status, e.total_tickets, e.available_tickets,
	e.thumbnail_url, e.video_url, e.flier_url, e.is_featured,
	e.created_at, e.updated_at,
	u.name, u.org_name`

const baseFromJoin = `
	FROM events e
	JOIN users u ON e.organizer_id = u.id`

func scanEvent(scan func(dest ...interface{}) error) (*Event, error) {
	ev := &Event{}
	err := scan(
		&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
		&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
		&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
		&ev.Status, &ev.TotalTickets, &ev.AvailableTickets,
		&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
		&ev.CreatedAt, &ev.UpdatedAt,
		&ev.OrganizerName, &ev.OrganizerOrgName,
	)
	return ev, err
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Event, error) {
	query := fmt.Sprintf("SELECT %s %s WHERE e.id = $1", baseSelectFields, baseFromJoin)
	row := r.db.QueryRow(ctx, query, id)
	return scanEvent(row.Scan)
}

func (r *Repository) GetByEventKey(ctx context.Context, eventKey string) (*Event, error) {
	query := fmt.Sprintf("SELECT %s %s WHERE e.event_key = $1", baseSelectFields, baseFromJoin)
	row := r.db.QueryRow(ctx, query, eventKey)
	return scanEvent(row.Scan)
}

func (r *Repository) List(ctx context.Context, q ListEventsQuery) ([]Event, int, error) {
	if q.Page < 1 {
		q.Page = 1
	}
	if q.Limit < 1 || q.Limit > 50 {
		q.Limit = 20
	}

	var conditions []string
	var args []interface{}
	argIdx := 1

	if q.Category != "" {
		conditions = append(conditions, fmt.Sprintf("e.category = $%d", argIdx))
		args = append(args, q.Category)
		argIdx++
	}

	if q.Status != "" {
		conditions = append(conditions, fmt.Sprintf("e.status = $%d", argIdx))
		args = append(args, q.Status)
		argIdx++
	} else {
		conditions = append(conditions, fmt.Sprintf("e.status = $%d", argIdx))
		args = append(args, "active")
		argIdx++
	}

	if q.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(e.title ILIKE $%d OR e.description ILIKE $%d OR e.location ILIKE $%d)", argIdx, argIdx, argIdx))
		args = append(args, "%"+q.Search+"%")
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM events e %s", whereClause)
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Fetch page
	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)

	dataQuery := fmt.Sprintf(
		"SELECT %s %s %s ORDER BY e.date ASC, e.created_at DESC LIMIT $%d OFFSET $%d",
		baseSelectFields, baseFromJoin, whereClause, argIdx, argIdx+1,
	)

	rows, err := r.db.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		ev, err := scanEvent(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, *ev)
	}

	return events, total, nil
}

func (r *Repository) ListByOrganizer(ctx context.Context, organizerID string, page, limit int) ([]Event, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	var total int
	err := r.db.QueryRow(ctx,
		"SELECT COUNT(*) FROM events WHERE organizer_id = $1", organizerID,
	).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	query := fmt.Sprintf(
		"SELECT %s %s WHERE e.organizer_id = $1 ORDER BY e.created_at DESC LIMIT $2 OFFSET $3",
		baseSelectFields, baseFromJoin,
	)

	rows, err := r.db.Query(ctx, query, organizerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		ev, err := scanEvent(rows.Scan)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, *ev)
	}

	return events, total, nil
}

func (r *Repository) Create(ctx context.Context, organizerID string, req CreateEventRequest) (*Event, error) {
	currency := req.Currency
	if currency == "" {
		currency = "NGN"
	}

	// Generate event key from title
	eventKey := generateEventKey(req.Title)

	query := fmt.Sprintf(`
		INSERT INTO events (organizer_id, title, description, date, time, end_date, location, price, currency, category, emoji, event_key, total_tickets, available_tickets, thumbnail_url, video_url, flier_url)
		VALUES ($1, $2, $3, $4::date, $5::time, $6::date, $7, $8, $9, $10, $11, $12, $13, $13, $14, $15, $16)
		RETURNING %s`, "e.id::text, e.organizer_id::text, e.title, e.description, e.date::text, e.time::text, e.end_date::text, e.location, e.price, e.currency, e.category, e.emoji, e.event_key, e.status, e.total_tickets, e.available_tickets, e.thumbnail_url, e.video_url, e.flier_url, e.is_featured, e.created_at, e.updated_at")

	// We need to do a two-step: insert then join-fetch, because RETURNING can't join
	var ev Event
	err := r.db.QueryRow(ctx, `
		INSERT INTO events (organizer_id, title, description, date, time, end_date, location, price, currency, category, emoji, event_key, total_tickets, available_tickets, thumbnail_url, video_url, flier_url)
		VALUES ($1, $2, $3, $4::date, $5::time, $6::date, $7, $8, $9, $10, $11, $12, $13, $13, $14, $15, $16)
		RETURNING id::text, organizer_id::text, title, description, date::text, time::text, end_date::text, location, price, currency, category, emoji, event_key, status, total_tickets, available_tickets, thumbnail_url, video_url, flier_url, is_featured, created_at, updated_at`,
		organizerID, req.Title, req.Description, req.Date, req.Time, req.EndDate,
		req.Location, req.Price, currency, req.Category, req.Emoji, eventKey,
		req.TotalTickets, req.ThumbnailURL, req.VideoURL, req.FlierURL,
	).Scan(
		&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
		&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
		&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
		&ev.Status, &ev.TotalTickets, &ev.AvailableTickets,
		&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
		&ev.CreatedAt, &ev.UpdatedAt,
	)
	_ = query // suppress unused

	if err != nil {
		return nil, err
	}

	return &ev, nil
}

func (r *Repository) Update(ctx context.Context, id, organizerID string, req UpdateEventRequest) (*Event, error) {
	// Build dynamic SET clause
	var setClauses []string
	var args []interface{}
	argIdx := 1

	addField := func(clause string, val interface{}) {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", clause, argIdx))
		args = append(args, val)
		argIdx++
	}

	if req.Title != nil {
		addField("title", *req.Title)
	}
	if req.Description != nil {
		addField("description", *req.Description)
	}
	if req.Date != nil {
		setClauses = append(setClauses, fmt.Sprintf("date = $%d::date", argIdx))
		args = append(args, *req.Date)
		argIdx++
	}
	if req.Time != nil {
		setClauses = append(setClauses, fmt.Sprintf("time = $%d::time", argIdx))
		args = append(args, *req.Time)
		argIdx++
	}
	if req.EndDate != nil {
		setClauses = append(setClauses, fmt.Sprintf("end_date = $%d::date", argIdx))
		args = append(args, *req.EndDate)
		argIdx++
	}
	if req.Location != nil {
		addField("location", *req.Location)
	}
	if req.Price != nil {
		addField("price", *req.Price)
	}
	if req.Currency != nil {
		addField("currency", *req.Currency)
	}
	if req.Category != nil {
		addField("category", *req.Category)
	}
	if req.Emoji != nil {
		addField("emoji", *req.Emoji)
	}
	if req.TotalTickets != nil {
		addField("total_tickets", *req.TotalTickets)
	}
	if req.Status != nil {
		addField("status", *req.Status)
	}
	if req.ThumbnailURL != nil {
		addField("thumbnail_url", *req.ThumbnailURL)
	}
	if req.VideoURL != nil {
		addField("video_url", *req.VideoURL)
	}
	if req.FlierURL != nil {
		addField("flier_url", *req.FlierURL)
	}

	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	args = append(args, id, organizerID)

	query := fmt.Sprintf(`
		UPDATE events SET %s
		WHERE id = $%d AND organizer_id = $%d
		RETURNING id::text, organizer_id::text, title, description, date::text, time::text, end_date::text, location, price, currency, category, emoji, event_key, status, total_tickets, available_tickets, thumbnail_url, video_url, flier_url, is_featured, created_at, updated_at`,
		strings.Join(setClauses, ", "), argIdx, argIdx+1,
	)

	var ev Event
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
		&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
		&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
		&ev.Status, &ev.TotalTickets, &ev.AvailableTickets,
		&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
		&ev.CreatedAt, &ev.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ev, nil
}

func (r *Repository) Delete(ctx context.Context, id, organizerID string) error {
	result, err := r.db.Exec(ctx,
		"DELETE FROM events WHERE id = $1 AND organizer_id = $2", id, organizerID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("event not found or not owned by organizer")
	}
	return nil
}

func (r *Repository) GetCategories(ctx context.Context) ([]string, error) {
	rows, err := r.db.Query(ctx,
		"SELECT DISTINCT category FROM events WHERE status = 'active' ORDER BY category",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []string
	for rows.Next() {
		var cat string
		if err := rows.Scan(&cat); err != nil {
			return nil, err
		}
		categories = append(categories, cat)
	}
	return categories, nil
}

// generateEventKey creates a URL-friendly slug from the title with a short random suffix.
func generateEventKey(title string) string {
	slug := strings.ToLower(title)
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		if r == ' ' || r == '-' {
			return '-'
		}
		return -1
	}, slug)

	// Trim consecutive dashes and edges
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")

	if len(slug) > 40 {
		slug = slug[:40]
	}

	// Append short random suffix
	suffix := fmt.Sprintf("%04x", uint16(time.Now().UnixNano()))
	return slug + "-" + suffix
}

// TotalPages calculates total pages for pagination.
func TotalPages(total, limit int) int {
	return int(math.Ceil(float64(total) / float64(limit)))
}
