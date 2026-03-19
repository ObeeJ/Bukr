/**
 * CONTROLLER LAYER — Admin HTTP Handlers
 *
 * Admin-only endpoints. All require user_type = 'admin' (enforced by
 * adminMiddleware in main.go before these handlers are ever called).
 *
 * Direct DB access via pgxpool — no proxy to Rust.
 * All list endpoints paginate (page + limit). No unbounded SELECT *.
 */

package admin

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

const (
	errInvalidBody = "Invalid body"
	whereBase      = "WHERE 1=1"
)

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/overview", h.Overview)
	router.Get("/users", h.ListUsers)
	router.Patch("/users/:id", h.UpdateUser)
	router.Get("/events", h.ListEvents)
	router.Patch("/events/:id", h.UpdateEvent)
	router.Get("/tickets", h.ListTickets)
	router.Get("/finance", h.FinanceSummary)
	router.Get("/finance/revenue", h.RevenueStream)
	router.Get("/vendors", h.ListVendors)
	router.Patch("/vendors/:id", h.UpdateVendor)
	router.Get("/influencers", h.ListInfluencers)
	router.Post("/payouts/:id/approve", h.ApprovePayout)
	router.Post("/payouts/:id/reject", h.RejectPayout)
	router.Get("/system/flags", h.GetFeatureFlags)
	router.Patch("/system/flags", h.UpdateFeatureFlags)
	router.Get("/system/logs", h.GetSystemLogs)
}

// ── helpers ──────────────────────────────────────────────────────────────────

func pageLimit(c *fiber.Ctx) (int, int) {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return page, limit
}

func pgOffset(page, limit int) int {
	return (page - 1) * limit
}

func ctx() context.Context {
	return context.Background()
}

// ── OVERVIEW ──────────────────────────────────────────────────────────────────

func (h *Handler) Overview(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"revenue_today": 0, "revenue_month": 0, "tickets_today": 0, "active_events": 0, "new_users_today": 0, "by_source": []fiber.Map{}})
	}

	var revenueToday, revenueMonth float64
	var ticketsToday, activeEvents, newUsersToday int

	h.db.QueryRow(ctx(), `SELECT COALESCE(SUM(amount),0) FROM platform_revenue WHERE created_at >= CURRENT_DATE`).Scan(&revenueToday)
	h.db.QueryRow(ctx(), `SELECT COALESCE(SUM(amount),0) FROM platform_revenue WHERE created_at >= DATE_TRUNC('month',NOW())`).Scan(&revenueMonth)
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM tickets WHERE created_at >= CURRENT_DATE`).Scan(&ticketsToday)
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM events WHERE status = 'active'`).Scan(&activeEvents)
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE`).Scan(&newUsersToday)

	rows, _ := h.db.Query(ctx(), `SELECT source, SUM(amount) AS total FROM platform_revenue WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY source ORDER BY total DESC`)
	defer rows.Close()
	bySource := []fiber.Map{}
	for rows.Next() {
		var src string
		var total float64
		rows.Scan(&src, &total)
		bySource = append(bySource, fiber.Map{"source": src, "total": total})
	}

	return shared.Success(c, 200, fiber.Map{
		"revenue_today": revenueToday, "revenue_month": revenueMonth,
		"tickets_today": ticketsToday, "active_events": activeEvents,
		"new_users_today": newUsersToday, "by_source": bySource,
	})
}

// ── USERS ─────────────────────────────────────────────────────────────────────

func (h *Handler) ListUsers(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"users": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)
	userType := c.Query("user_type")

	var total int
	if userType != "" {
		h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM users WHERE user_type = $1`, userType).Scan(&total)
	} else {
		h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM users`).Scan(&total)
	}

	var query string
	var args []any
	if userType != "" {
		query = `SELECT id::text, email, name, user_type, COALESCE(is_active, true), created_at::text FROM users WHERE user_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = []any{userType, limit, pgOffset(page, limit)}
	} else {
		query = `SELECT id::text, email, name, user_type, COALESCE(is_active, true), created_at::text FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`
		args = []any{limit, pgOffset(page, limit)}
	}

	rows, err := h.db.Query(ctx(), query, args...)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to list users")
	}
	defer rows.Close()

	users := []fiber.Map{}
	for rows.Next() {
		var id, email, userTypeVal, createdAt string
		var name *string
		var isActive bool
		rows.Scan(&id, &email, &name, &userTypeVal, &isActive, &createdAt)
		users = append(users, fiber.Map{"id": id, "email": email, "name": name, "user_type": userTypeVal, "is_active": isActive, "created_at": createdAt})
	}

	return shared.Success(c, 200, fiber.Map{"users": users, "total": total, "page": page, "limit": limit})
}

func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"updated": true})
	}
	if isActive, ok := body["is_active"].(bool); ok {
		h.db.Exec(ctx(), `UPDATE users SET is_active = $1 WHERE id = $2`, isActive, id)
	}
	if userType, ok := body["user_type"].(string); ok {
		h.db.Exec(ctx(), `UPDATE users SET user_type = $1 WHERE id = $2`, userType, id)
	}
	return shared.Success(c, 200, fiber.Map{"updated": true})
}

// ── EVENTS ────────────────────────────────────────────────────────────────────

func (h *Handler) ListEvents(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"events": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)
	status := c.Query("status")

	where := whereBase
	args := []any{}
	idx := 1
	if status != "" {
		where += fmt.Sprintf(" AND e.status = $%d", idx)
		args = append(args, status)
		idx++
	}

	var total int
	h.db.QueryRow(ctx(), "SELECT COUNT(*) FROM events e "+where, args...).Scan(&total)

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT e.id::text, e.title, e.status, e.date::text, e.organizer_id::text,
		       COALESCE((SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id AND t.status != 'cancelled'), 0),
		       COALESCE(e.available_tickets, 0) + COALESCE((SELECT COUNT(*) FROM tickets t WHERE t.event_id = e.id AND t.status != 'cancelled'), 0),
		       COALESCE((SELECT SUM(pt.amount) FROM payment_transactions pt JOIN tickets tk ON tk.id = pt.ticket_id WHERE tk.event_id = e.id AND pt.status = 'completed'), 0),
		       COALESCE(e.featured_paid, false)
		FROM events e
		`+where+`
		ORDER BY e.created_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to list events")
	}
	defer rows.Close()

	events := []fiber.Map{}
	for rows.Next() {
		var id, title, status, date, orgID string
		var ticketsSold, totalTickets int
		var totalRevenue float64
		var isFeatured bool
		rows.Scan(&id, &title, &status, &date, &orgID, &ticketsSold, &totalTickets, &totalRevenue, &isFeatured)
		events = append(events, fiber.Map{
			"id": id, "title": title, "status": status, "date": date,
			"organizer_id": orgID, "tickets_sold": ticketsSold,
			"total_tickets": totalTickets, "total_revenue": totalRevenue, "is_featured": isFeatured,
		})
	}

	return shared.Success(c, 200, fiber.Map{"events": events, "total": total, "page": page, "limit": limit})
}

func (h *Handler) UpdateEvent(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"updated": true})
	}
	id := c.Params("id")
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	if isFeatured, ok := body["is_featured"].(bool); ok {
		h.db.Exec(ctx(), `UPDATE events SET featured_paid = $1 WHERE id = $2`, isFeatured, id)
	}
	if status, ok := body["status"].(string); ok {
		h.db.Exec(ctx(), `UPDATE events SET status = $1 WHERE id = $2`, status, id)
	}
	return shared.Success(c, 200, fiber.Map{"updated": true})
}

// ── TICKETS ───────────────────────────────────────────────────────────────────

func (h *Handler) ListTickets(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"tickets": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)
	status := c.Query("status")
	eventID := c.Query("event_id")

	where := whereBase
	args := []any{}
	idx := 1
	if status != "" {
		where += fmt.Sprintf(" AND t.status = $%d", idx)
		args = append(args, status)
		idx++
	}
	if eventID != "" {
		where += fmt.Sprintf(" AND t.event_id = $%d", idx)
		args = append(args, eventID)
		idx++
	}

	var total int
	h.db.QueryRow(ctx(), "SELECT COUNT(*) FROM tickets t "+where, args...).Scan(&total)

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT t.id::text, COALESCE(e.title,'') AS event_title,
		       COALESCE(u.email,'') AS buyer_email,
		       COALESCE(t.price,0) AS amount, t.status, t.created_at::text
		FROM tickets t
		LEFT JOIN events e ON e.id = t.event_id
		LEFT JOIN users u ON u.id = t.user_id
		`+where+`
		ORDER BY t.created_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to list tickets")
	}
	defer rows.Close()

	tickets := []fiber.Map{}
	for rows.Next() {
		var id, eventTitle, buyerEmail, ticketStatus, createdAt string
		var amount float64
		rows.Scan(&id, &eventTitle, &buyerEmail, &amount, &ticketStatus, &createdAt)
		tickets = append(tickets, fiber.Map{
			"id": id, "event_title": eventTitle, "buyer_email": buyerEmail,
			"amount": amount, "status": ticketStatus, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"tickets": tickets, "total": total, "page": page, "limit": limit})
}

// ── FINANCE ───────────────────────────────────────────────────────────────────

func (h *Handler) FinanceSummary(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"today": 0, "week": 0, "month": 0, "all_time": 0, "by_source": []fiber.Map{}})
	}
	var today, week, month, allTime float64
	h.db.QueryRow(ctx(), `
		SELECT
			COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END),0),
			COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN amount ELSE 0 END),0),
			COALESCE(SUM(CASE WHEN created_at >= DATE_TRUNC('month',NOW()) THEN amount ELSE 0 END),0),
			COALESCE(SUM(amount),0)
		FROM platform_revenue
	`).Scan(&today, &week, &month, &allTime)

	rows, _ := h.db.Query(ctx(), `SELECT source, SUM(amount) AS total FROM platform_revenue GROUP BY source ORDER BY total DESC`)
	defer rows.Close()
	bySource := []fiber.Map{}
	for rows.Next() {
		var src string
		var total float64
		rows.Scan(&src, &total)
		bySource = append(bySource, fiber.Map{"source": src, "total": total})
	}
	return shared.Success(c, 200, fiber.Map{"today": today, "week": week, "month": month, "all_time": allTime, "by_source": bySource})
}

func (h *Handler) RevenueStream(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"entries": []fiber.Map{}, "by_source": []fiber.Map{}})
	}
	page, limit := pageLimit(c)
	source := c.Query("source")

	where := whereBase
	args := []any{}
	idx := 1
	if source != "" {
		where += fmt.Sprintf(" AND source = $%d", idx)
		args = append(args, source)
		idx++
	}

	srcRows, _ := h.db.Query(ctx(), "SELECT source, SUM(amount) AS total FROM platform_revenue "+where+" GROUP BY source ORDER BY total DESC", args...)
	defer srcRows.Close()
	bySource := []fiber.Map{}
	for srcRows.Next() {
		var src string
		var total float64
		srcRows.Scan(&src, &total)
		bySource = append(bySource, fiber.Map{"source": src, "total": total})
	}

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT id::text, source, amount, organizer_id::text, created_at::text
		FROM platform_revenue
		`+where+`
		ORDER BY created_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load revenue")
	}
	defer rows.Close()

	entries := []fiber.Map{}
	for rows.Next() {
		var id, src, createdAt string
		var orgID *string
		var amount float64
		rows.Scan(&id, &src, &amount, &orgID, &createdAt)
		entries = append(entries, fiber.Map{"id": id, "source": src, "amount": amount, "organizer_id": orgID, "created_at": createdAt})
	}
	return shared.Success(c, 200, fiber.Map{"entries": entries, "by_source": bySource})
}

// ── VENDORS ───────────────────────────────────────────────────────────────────

func (h *Handler) ListVendors(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"vendors": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)

	var total int
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM vendors`).Scan(&total)

	rows, err := h.db.Query(ctx(), `
		SELECT id::text, business_name, category, city, tier,
		       bayesian_rating, hire_count, completion_rate, is_verified
		FROM vendors ORDER BY bayesian_rating DESC LIMIT $1 OFFSET $2
	`, limit, pgOffset(page, limit))
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to list vendors")
	}
	defer rows.Close()

	vendors := []fiber.Map{}
	for rows.Next() {
		var id, name, cat, city, tier string
		var rating, completion float64
		var hires int
		var verified bool
		rows.Scan(&id, &name, &cat, &city, &tier, &rating, &hires, &completion, &verified)
		vendors = append(vendors, fiber.Map{
			"id": id, "business_name": name, "category": cat, "city": city, "tier": tier,
			"bayesian_rating": rating, "hire_count": hires, "completion_rate": completion, "is_verified": verified,
		})
	}
	return shared.Success(c, 200, fiber.Map{"vendors": vendors, "total": total, "page": page, "limit": limit})
}

func (h *Handler) UpdateVendor(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"updated": true})
	}
	id := c.Params("id")
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	if v, ok := body["is_verified"].(bool); ok {
		h.db.Exec(ctx(), `UPDATE vendors SET is_verified = $1, updated_at = NOW() WHERE id = $2`, v, id)
	}
	if tier, ok := body["tier"].(string); ok {
		h.db.Exec(ctx(), `UPDATE vendors SET tier = $1, updated_at = NOW() WHERE id = $2`, tier, id)
	}
	return shared.Success(c, 200, fiber.Map{"updated": true})
}

// ── INFLUENCERS + PAYOUTS ─────────────────────────────────────────────────────

func (h *Handler) ListInfluencers(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"influencers": []fiber.Map{}, "total": 0, "pending_payouts": []fiber.Map{}})
	}
	page, limit := pageLimit(c)

	var total int
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM influencers`).Scan(&total)

	rows, _ := h.db.Query(ctx(), `
		SELECT i.id::text, u.name, u.email,
		       COALESCE(i.total_referrals,0), COALESCE(i.total_earnings,0), COALESCE(i.pending_earnings,0)
		FROM influencers i
		LEFT JOIN users u ON u.id = i.user_id
		ORDER BY i.pending_earnings DESC NULLS LAST
		LIMIT $1 OFFSET $2
	`, limit, pgOffset(page, limit))
	defer rows.Close()

	influencers := []fiber.Map{}
	for rows.Next() {
		var id string
		var name, email *string
		var totalRef int
		var totalRev, pending float64
		rows.Scan(&id, &name, &email, &totalRef, &totalRev, &pending)
		influencers = append(influencers, fiber.Map{
			"id": id, "name": name, "email": email,
			"total_referrals": totalRef, "total_revenue": totalRev, "pending_earnings": pending,
		})
	}

	// Pending payout queue
	pRows, _ := h.db.Query(ctx(), `
		SELECT p.id::text, p.influencer_id::text, u.name, p.amount, p.requested_at::text
		FROM influencer_payouts p
		JOIN influencers i ON i.id = p.influencer_id
		LEFT JOIN users u ON u.id = i.user_id
		WHERE p.status = 'pending'
		ORDER BY p.requested_at ASC LIMIT 20
	`)
	defer pRows.Close()
	pendingPayouts := []fiber.Map{}
	for pRows.Next() {
		var id, infID, requestedAt string
		var name *string
		var amount float64
		pRows.Scan(&id, &infID, &name, &amount, &requestedAt)
		pendingPayouts = append(pendingPayouts, fiber.Map{
			"id": id, "influencer_id": infID, "influencer_name": name,
			"amount": amount, "requested_at": requestedAt,
		})
	}

	return shared.Success(c, 200, fiber.Map{
		"influencers": influencers, "total": total, "pending_payouts": pendingPayouts,
	})
}

func (h *Handler) ApprovePayout(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"approved": true})
	}
	id := c.Params("id")
	h.db.Exec(ctx(), `UPDATE influencer_payouts SET status = 'processing' WHERE id = $1 AND status = 'pending'`, id)
	return shared.Success(c, 200, fiber.Map{"approved": true})
}

func (h *Handler) RejectPayout(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Note string `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"rejected": true})
	}
	h.db.Exec(ctx(), `UPDATE influencer_payouts SET status = 'failed' WHERE id = $1 AND status = 'pending'`, id)
	return shared.Success(c, 200, fiber.Map{"rejected": true, "note": body.Note})
}

// ── SYSTEM FLAGS ──────────────────────────────────────────────────────────────

func (h *Handler) GetFeatureFlags(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"flags": fiber.Map{}})
	}
	var flagsJSON string
	err := h.db.QueryRow(ctx(), `SELECT COALESCE(value,'{}') FROM system_config WHERE key = 'feature_flags' LIMIT 1`).Scan(&flagsJSON)
	if err != nil {
		return shared.Success(c, 200, fiber.Map{"flags": fiber.Map{}})
	}
	return c.Status(200).JSON(fiber.Map{"status": "success", "data": fiber.Map{"flags": flagsJSON}})
}

func (h *Handler) UpdateFeatureFlags(c *fiber.Ctx) error {
	rawBody := c.Body()
	if !json.Valid(rawBody) {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"updated": true})
	}
	// Store raw body as JSONB value
	h.db.Exec(ctx(), `
		INSERT INTO system_config (key, value) VALUES ('feature_flags', $1)
		ON CONFLICT (key) DO UPDATE SET value = $1
	`, string(rawBody))
	return shared.Success(c, 200, fiber.Map{"updated": true})
}

// ── SYSTEM LOGS ───────────────────────────────────────────────────────────────

func (h *Handler) GetSystemLogs(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"logs": []fiber.Map{}})
	}
	_, limit := pageLimit(c)
	rows, err := h.db.Query(ctx(), `
		SELECT created_at::text, level, message FROM system_logs ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		// Table may not exist — return empty gracefully
		return shared.Success(c, 200, fiber.Map{"logs": []fiber.Map{}})
	}
	defer rows.Close()

	logs := []fiber.Map{}
	for rows.Next() {
		var ts, level, message string
		rows.Scan(&ts, &level, &message)
		logs = append(logs, fiber.Map{"timestamp": ts, "level": level, "message": message})
	}
	return shared.Success(c, 200, fiber.Map{"logs": logs})
}
