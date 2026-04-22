/**
 * REPOSITORY LAYER - Event Database Operations
 * 
 * Event Repository: The event vault - storing and retrieving events
 * 
 * Architecture Layer: Repository (Layer 5)
 * Dependencies: Database (PostgreSQL via pgx)
 * Responsibility: CRUD operations for events table
 * 
 * Database Table: events
 * Key columns:
 * - id: UUID primary key
 * - organizer_id: Foreign key to users
 * - event_key: URL-friendly slug (unique)
 * - status: active, cancelled, completed
 * - total_tickets, available_tickets: Inventory tracking
 * 
 * Complex Operations:
 * - Dynamic filtering (category, status, search)
 * - Pagination with total count
 * - JOIN with users for organizer info
 * - URL slug generation from title
 */

package events

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

/**
 * Repository: Event data access
 */
type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// SQL fragments for reusable queries
const baseSelectFields = `
	e.id::text, e.organizer_id::text, e.title, e.description,
	e.date::text, e.time::text, e.end_date::text, e.location,
	e.city, e.event_type, e.latitude, e.longitude, e.online_link,
	e.price, e.currency, e.category, e.emoji, e.event_key,
	e.status, e.total_tickets, e.available_tickets, e.requires_payment,
	e.thumbnail_url, e.video_url, e.flier_url, e.is_featured,
	e.created_at, e.updated_at,
	u.name, u.org_name`

const baseFromJoin = `
	FROM events e
	JOIN users u ON e.organizer_id = u.id`

/**
 * scanEvent: Helper to scan database row into Event struct
 */
func scanEvent(scan func(dest ...interface{}) error) (*Event, error) {
	ev := &Event{}
	err := scan(
		&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
		&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
		&ev.City, &ev.EventType, &ev.Latitude, &ev.Longitude, &ev.OnlineLink,
		&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
		&ev.Status, &ev.TotalTickets, &ev.AvailableTickets, &ev.RequiresPayment,
		&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
		&ev.CreatedAt, &ev.UpdatedAt,
		&ev.OrganizerName, &ev.OrganizerOrgName,
	)
	return ev, err
}

/**
 * GetByID: Get event by UUID
 */
func (r *Repository) GetByID(ctx context.Context, id string) (*Event, error) {
	query := fmt.Sprintf("SELECT %s %s WHERE e.id = $1", baseSelectFields, baseFromJoin)
	row := r.db.QueryRow(ctx, query, id)
	return scanEvent(row.Scan)
}

/**
 * GetByEventKey: Get event by URL slug
 */
func (r *Repository) GetByEventKey(ctx context.Context, eventKey string) (*Event, error) {
	query := fmt.Sprintf("SELECT %s %s WHERE e.event_key = $1", baseSelectFields, baseFromJoin)
	row := r.db.QueryRow(ctx, query, eventKey)
	return scanEvent(row.Scan)
}

// List fetches paginated events in a SINGLE query using COUNT(*) OVER().
// This eliminates the previous double-query pattern (separate COUNT + SELECT)
// which fired two sequential round-trips to the DB on every page load.
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
	if q.City != "" {
		conditions = append(conditions, fmt.Sprintf("LOWER(e.city) = LOWER($%d)", argIdx))
		args = append(args, q.City)
		argIdx++
	}
	if q.EventType != "" {
		conditions = append(conditions, fmt.Sprintf("e.event_type = $%d", argIdx))
		args = append(args, q.EventType)
		argIdx++
	}
	if q.Search != "" {
		// Full-text search via tsvector — O(log n) index scan vs O(n) ILIKE table scan.
		// Requires: CREATE INDEX ON events USING GIN(to_tsvector('english', title || ' ' || description || ' ' || location))
		// plainto_tsquery handles multi-word queries and strips stop words automatically.
		conditions = append(conditions, fmt.Sprintf(
			"to_tsvector('english', COALESCE(e.title,'') || ' ' || COALESCE(e.description,'') || ' ' || COALESCE(e.location,'')) @@ plainto_tsquery('english', $%d)",
			argIdx,
		))
		args = append(args, q.Search)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	offset := (q.Page - 1) * q.Limit
	args = append(args, q.Limit, offset)

	// COUNT(*) OVER() computes the total in the same pass as the data fetch.
	// One round-trip instead of two — halves DB load on the hottest endpoint.
	query := fmt.Sprintf(`
		SELECT %s, COUNT(*) OVER() AS total_count
		%s
		%s
		ORDER BY e.date ASC, e.created_at DESC
		LIMIT $%d OFFSET $%d`,
		baseSelectFields, baseFromJoin, whereClause, argIdx, argIdx+1,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event
	total := 0
	for rows.Next() {
		ev := &Event{}
		err := rows.Scan(
			&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
			&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
			&ev.City, &ev.EventType, &ev.Latitude, &ev.Longitude, &ev.OnlineLink,
			&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
			&ev.Status, &ev.TotalTickets, &ev.AvailableTickets, &ev.RequiresPayment,
			&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
			&ev.CreatedAt, &ev.UpdatedAt,
			&ev.OrganizerName, &ev.OrganizerOrgName,
			&total,
		)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, *ev)
	}

	return events, total, nil
}

/**
 * ListByOrganizer: List organizer's events
 * 
 * Only returns events owned by organizer
 */
func (r *Repository) ListByOrganizer(ctx context.Context, organizerID string, page, limit int) ([]Event, int, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}

	offset := (page - 1) * limit
	query := fmt.Sprintf(
		"SELECT %s, COUNT(*) OVER() AS total_count %s WHERE e.organizer_id = $1 ORDER BY e.created_at DESC LIMIT $2 OFFSET $3",
		baseSelectFields, baseFromJoin,
	)

	rows, err := r.db.Query(ctx, query, organizerID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []Event
	total := 0
	for rows.Next() {
		ev := &Event{}
		err := rows.Scan(
			&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
			&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
			&ev.City, &ev.EventType, &ev.Latitude, &ev.Longitude, &ev.OnlineLink,
			&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
			&ev.Status, &ev.TotalTickets, &ev.AvailableTickets, &ev.RequiresPayment,
			&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
			&ev.CreatedAt, &ev.UpdatedAt,
			&ev.OrganizerName, &ev.OrganizerOrgName,
			&total,
		)
		if err != nil {
			return nil, 0, err
		}
		events = append(events, *ev)
	}

	return events, total, nil
}

/**
 * Create: Create new event
 * 
 * Generates unique event_key from title
 * Default currency: NGN
 */
func (r *Repository) Create(ctx context.Context, organizerID string, req CreateEventRequest) (*Event, error) {
	// Default currency
	currency := req.Currency
	if currency == "" {
		currency = "NGN"
	}

	// Default requires_payment based on price
	requiresPayment := true
	if req.RequiresPayment != nil {
		requiresPayment = *req.RequiresPayment
	} else if req.Price == 0 {
		requiresPayment = false
	}

	// Default event_type
	eventType := req.EventType
	if eventType == "" {
		eventType = "physical"
	}

	// Derive city: use provided value, fall back to last comma-segment of location.
	// Online events always get city = 'Online' regardless of what was sent.
	city := strings.TrimSpace(req.City)
	if eventType == "online" {
		city = "Online"
	} else if city == "" {
		parts := strings.Split(req.Location, ",")
		city = strings.TrimSpace(parts[len(parts)-1])
		if city == "" {
			city = strings.TrimSpace(req.Location)
		}
	}

	// Generate URL-friendly slug
	eventKey := generateEventKey(req.Title)

	// Insert event (available_tickets = total_tickets initially)
	var ev Event
	err := r.db.QueryRow(ctx, `
		INSERT INTO events
		  (organizer_id, title, description, date, time, end_date, location, city, event_type,
		   latitude, longitude, online_link,
		   price, currency, category, emoji, event_key, total_tickets, available_tickets,
		   requires_payment, thumbnail_url, video_url, flier_url)
		VALUES ($1, $2, $3, $4::date, $5::time, $6::date, $7, $8, $9,
		        $10, $11, $12,
		        $13, $14, $15, $16, $17, $18, $18,
		        $19, $20, $21, $22)
		RETURNING id::text, organizer_id::text, title, description, date::text, time::text,
		          end_date::text, location, city, event_type, latitude, longitude, online_link,
		          price, currency, category, emoji,
		          event_key, status, total_tickets, available_tickets, requires_payment,
		          thumbnail_url, video_url, flier_url, is_featured, created_at, updated_at`,
		organizerID, req.Title, req.Description, req.Date, req.Time, req.EndDate,
		req.Location, city, eventType,
		req.Latitude, req.Longitude, req.OnlineLink,
		req.Price, currency, req.Category, req.Emoji, eventKey,
		req.TotalTickets, requiresPayment, req.ThumbnailURL, req.VideoURL, req.FlierURL,
	).Scan(
		&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
		&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
		&ev.City, &ev.EventType, &ev.Latitude, &ev.Longitude, &ev.OnlineLink,
		&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
		&ev.Status, &ev.TotalTickets, &ev.AvailableTickets, &ev.RequiresPayment,
		&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
		&ev.CreatedAt, &ev.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &ev, nil
}

/**
 * Update: Update event details
 * 
 * Partial update using dynamic SET clause
 * Only owner can update
 */
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
	if req.City != nil {
		addField("city", *req.City)
	}
	if req.EventType != nil {
		// Guard against invalid values — DB CHECK constraint will also catch this
		switch *req.EventType {
		case "physical", "online", "hybrid":
			addField("event_type", *req.EventType)
		}
	}
	if req.Latitude != nil {
		addField("latitude", *req.Latitude)
	}
	if req.Longitude != nil {
		addField("longitude", *req.Longitude)
	}
	if req.OnlineLink != nil {
		addField("online_link", *req.OnlineLink)
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
	if req.RequiresPayment != nil {
		addField("requires_payment", *req.RequiresPayment)
	}

	// No changes, return existing
	if len(setClauses) == 0 {
		return r.GetByID(ctx, id)
	}

	args = append(args, id, organizerID)

	query := fmt.Sprintf(`
		UPDATE events SET %s
		WHERE id = $%d AND organizer_id = $%d
		RETURNING id::text, organizer_id::text, title, description, date::text, time::text,
		          end_date::text, location, city, event_type, latitude, longitude, online_link,
		          price, currency, category, emoji,
		          event_key, status, total_tickets, available_tickets, requires_payment,
		          thumbnail_url, video_url, flier_url, is_featured, created_at, updated_at`,
		strings.Join(setClauses, ", "), argIdx, argIdx+1,
	)

	var ev Event
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&ev.ID, &ev.OrganizerID, &ev.Title, &ev.Description,
		&ev.Date, &ev.Time, &ev.EndDate, &ev.Location,
		&ev.City, &ev.EventType, &ev.Latitude, &ev.Longitude, &ev.OnlineLink,
		&ev.Price, &ev.Currency, &ev.Category, &ev.Emoji, &ev.EventKey,
		&ev.Status, &ev.TotalTickets, &ev.AvailableTickets, &ev.RequiresPayment,
		&ev.ThumbnailURL, &ev.VideoURL, &ev.FlierURL, &ev.IsFeatured,
		&ev.CreatedAt, &ev.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &ev, nil
}

/**
 * Delete: Delete event
 * 
 * Only owner can delete
 */
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

/**
 * GetCategories: Get distinct event categories
 * 
 * Only returns categories from active events
 */
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

/**
 * generateEventKey: Create URL-friendly slug from title
 * 
 * Format: {slug}-{random}
 * Example: summer-fest-2024-a3f2
 * 
 * Steps:
 * 1. Lowercase and clean title
 * 2. Replace spaces with hyphens
 * 3. Remove non-alphanumeric chars
 * 4. Truncate to 40 chars
 * 5. Add 4-char random hex suffix
 */
func generateEventKey(title string) string {
	// Clean and normalize title
	slug := strings.ToLower(title)
	slug = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		if r == ' ' || r == '-' {
			return '-'
		}
		return -1    // Remove char
	}, slug)

	// Clean up consecutive dashes
	for strings.Contains(slug, "--") {
		slug = strings.ReplaceAll(slug, "--", "-")
	}
	slug = strings.Trim(slug, "-")

	// Truncate if too long
	if len(slug) > 40 {
		slug = slug[:40]
	}

	// Add random suffix for uniqueness
	b := make([]byte, 2)
	if _, err := rand.Read(b); err != nil {
		// Fallback if crypto/rand fails
		suffix := fmt.Sprintf("%04x", uint16(time.Now().UnixNano()))
		return slug + "-" + suffix
	}
	suffix := hex.EncodeToString(b)
	return slug + "-" + suffix
}

/**
 * TotalPages: Calculate total pages for pagination
 */
func TotalPages(total, limit int) int {
	return int(math.Ceil(float64(total) / float64(limit)))
}
