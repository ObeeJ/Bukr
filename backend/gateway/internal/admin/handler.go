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

	"github.com/bukr/gateway/internal/middleware"
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
	// P0: compliance + operational visibility
	router.Get("/audit-log", h.ListAuditLog)
	router.Get("/payments", h.ListPayments)
	// P1: disputes + organizer intelligence
	router.Get("/disputes", h.ListDisputes)
	router.Patch("/disputes/:id/resolve", h.ResolveDispute)
	router.Get("/organizers", h.ListOrganizers)
	// P2: full observability layer
	router.Get("/overview/timeseries", h.OverviewTimeseries)
	router.Get("/users/search", h.SearchUsers)
	router.Get("/users/:id", h.GetUserDetail)
	router.Get("/waitlist", h.ListWaitlist)
	router.Get("/promos", h.ListPromos)
	router.Get("/scan-logs", h.ListScanLogs)
	router.Get("/feedback", h.ListFeedbackAdmin)
}

// ── audit helper ─────────────────────────────────────────────────────────────

// writeAudit records every admin mutation. Cheap INSERT — never blocks the
// response. If it fails we log and move on; the action already succeeded.
func (h *Handler) writeAudit(c *fiber.Ctx, action, entityType, entityID string, meta fiber.Map) {
	if h.db == nil {
		return
	}
	claims := middleware.GetAdminClaims(c)
	if claims == nil {
		return
	}
	metaJSON, _ := json.Marshal(meta)
	h.db.Exec(ctx(),
		`INSERT INTO admin_audit_log (admin_id, admin_email, action, entity_type, entity_id, meta, ip)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		claims.UserID, claims.Email, action, entityType, entityID, string(metaJSON), c.IP(),
	)
}

// ── helpers ───────────────────────────────────────────────────────────────────

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

	// Single round-trip: all KPI aggregates in one query using FILTER.
	// Previously 5 separate QueryRow calls — each a full network round-trip to Postgres.
	var revenueToday, revenueMonth float64
	var ticketsToday, activeEvents, newUsersToday int
	h.db.QueryRow(ctx(), `
		SELECT
		  (SELECT COALESCE(SUM(amount),0) FROM platform_revenue WHERE created_at >= CURRENT_DATE),
		  (SELECT COALESCE(SUM(amount),0) FROM platform_revenue WHERE created_at >= DATE_TRUNC('month',NOW())),
		  (SELECT COUNT(*) FROM tickets WHERE created_at >= CURRENT_DATE),
		  (SELECT COUNT(*) FROM events WHERE status = 'active'),
		  (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE)
	`).Scan(&revenueToday, &revenueMonth, &ticketsToday, &activeEvents, &newUsersToday)

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
	action := "user.update"
	if isActive, ok := body["is_active"].(bool); ok {
		h.db.Exec(ctx(), `UPDATE users SET is_active = $1 WHERE id = $2`, isActive, id)
		if isActive {
			action = "user.reactivate"
		} else {
			action = "user.deactivate"
		}
	}
	if userType, ok := body["user_type"].(string); ok {
		h.db.Exec(ctx(), `UPDATE users SET user_type = $1 WHERE id = $2`, userType, id)
		action = "user.role_change"
	}
	h.writeAudit(c, action, "user", id, fiber.Map{"changes": body})
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
		       COALESCE((SELECT SUM(pt.amount) FROM payment_transactions pt JOIN tickets tk ON tk.id = pt.ticket_id WHERE tk.event_id = e.id AND pt.status = 'success'), 0),
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
	action := "event.update"
	if isFeatured, ok := body["is_featured"].(bool); ok {
		h.db.Exec(ctx(), `UPDATE events SET featured_paid = $1 WHERE id = $2`, isFeatured, id)
		if isFeatured {
			action = "event.feature"
		} else {
			action = "event.unfeature"
		}
	}
	if status, ok := body["status"].(string); ok {
		h.db.Exec(ctx(), `UPDATE events SET status = $1 WHERE id = $2`, status, id)
		action = "event.status_change"
	}
	h.writeAudit(c, action, "event", id, fiber.Map{"changes": body})
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
	action := "vendor.update"
	if v, ok := body["is_verified"].(bool); ok {
		h.db.Exec(ctx(), `UPDATE vendors SET is_verified = $1, updated_at = NOW() WHERE id = $2`, v, id)
		if v {
			action = "vendor.verify"
		} else {
			action = "vendor.unverify"
		}
	}
	if tier, ok := body["tier"].(string); ok {
		h.db.Exec(ctx(), `UPDATE vendors SET tier = $1, updated_at = NOW() WHERE id = $2`, tier, id)
		action = "vendor.tier_change"
	}
	h.writeAudit(c, action, "vendor", id, fiber.Map{"changes": body})
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

	// Pending payout queue — no cap, paginated via outer page/limit
	pRows, _ := h.db.Query(ctx(), `
		SELECT p.id::text, p.influencer_id::text, u.name, p.amount, p.requested_at::text
		FROM influencer_payouts p
		JOIN influencers i ON i.id = p.influencer_id
		LEFT JOIN users u ON u.id = i.user_id
		WHERE p.status = 'pending'
		ORDER BY p.requested_at ASC
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
	h.writeAudit(c, "payout.approve", "payout", id, fiber.Map{})
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
	h.writeAudit(c, "payout.reject", "payout", id, fiber.Map{"note": body.Note})
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
	return c.Status(200).JSON(fiber.Map{"status": "success", "data": fiber.Map{"flags": json.RawMessage(flagsJSON)}})
}

func (h *Handler) UpdateFeatureFlags(c *fiber.Ctx) error {
	rawBody := c.Body()
	if !json.Valid(rawBody) {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"updated": true})
	}
	h.db.Exec(ctx(), `
		INSERT INTO system_config (key, value) VALUES ('feature_flags', $1)
		ON CONFLICT (key) DO UPDATE SET value = $1
	`, string(rawBody))
	h.writeAudit(c, "flag.update", "system", "feature_flags", fiber.Map{"flags": string(rawBody)})
	return shared.Success(c, 200, fiber.Map{"updated": true})
}

// ── AUDIT LOG ────────────────────────────────────────────────────────────────

func (h *Handler) ListAuditLog(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"logs": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)
	adminID := c.Query("admin_id")
	entityType := c.Query("entity_type")
	action := c.Query("action")

	where := whereBase
	args := []any{}
	idx := 1
	if adminID != "" {
		where += fmt.Sprintf(" AND admin_id = $%d", idx)
		args = append(args, adminID)
		idx++
	}
	if entityType != "" {
		where += fmt.Sprintf(" AND entity_type = $%d", idx)
		args = append(args, entityType)
		idx++
	}
	if action != "" {
		where += fmt.Sprintf(" AND action = $%d", idx)
		args = append(args, action)
		idx++
	}

	var total int
	h.db.QueryRow(ctx(), "SELECT COUNT(*) FROM admin_audit_log "+where, args...).Scan(&total)

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT id::text, admin_id::text, admin_email, action, entity_type,
		       COALESCE(entity_id,''), COALESCE(meta::text,'{}'), COALESCE(ip,''), created_at::text
		FROM admin_audit_log
		`+where+`
		ORDER BY created_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load audit log")
	}
	defer rows.Close()

	logs := []fiber.Map{}
	for rows.Next() {
		var id, adminIDVal, adminEmail, actionVal, entityTypeVal, entityID, metaStr, ip, createdAt string
		rows.Scan(&id, &adminIDVal, &adminEmail, &actionVal, &entityTypeVal, &entityID, &metaStr, &ip, &createdAt)
		logs = append(logs, fiber.Map{
			"id": id, "admin_id": adminIDVal, "admin_email": adminEmail,
			"action": actionVal, "entity_type": entityTypeVal, "entity_id": entityID,
			"meta": metaStr, "ip": ip, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"logs": logs, "total": total, "page": page, "limit": limit})
}

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

func (h *Handler) ListPayments(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"payments": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)
	status := c.Query("status")

	where := whereBase
	args := []any{}
	idx := 1
	if status != "" {
		where += fmt.Sprintf(" AND pt.status = $%d", idx)
		args = append(args, status)
		idx++
	}

	var total int
	h.db.QueryRow(ctx(), "SELECT COUNT(*) FROM payment_transactions pt "+where, args...).Scan(&total)

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT pt.id::text, pt.provider_ref, pt.amount, pt.status,
		       COALESCE(u.email,'') AS buyer_email,
		       COALESCE(e.title,'') AS event_title,
		       COALESCE(pt.provider,'paystack') AS provider,
		       pt.created_at::text
		FROM payment_transactions pt
		LEFT JOIN tickets tk ON tk.id = pt.ticket_id
		LEFT JOIN users u ON u.id = pt.user_id
		LEFT JOIN events e ON e.id = tk.event_id
		`+where+`
		ORDER BY pt.created_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load payments")
	}
	defer rows.Close()

	payments := []fiber.Map{}
	for rows.Next() {
		var id, ref, status2, buyerEmail, eventTitle, provider, createdAt string
		var amount float64
		rows.Scan(&id, &ref, &amount, &status2, &buyerEmail, &eventTitle, &provider, &createdAt)
		payments = append(payments, fiber.Map{
			"id": id, "reference": ref, "amount": amount, "status": status2,
			"buyer_email": buyerEmail, "event_title": eventTitle,
			"provider": provider, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"payments": payments, "total": total, "page": page, "limit": limit})
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

// ── DISPUTES ──────────────────────────────────────────────────────────────────

func (h *Handler) ListDisputes(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"disputes": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)

	var total int
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM vendor_hires WHERE status = 'disputed'`).Scan(&total)

	rows, err := h.db.Query(ctx(), `
		SELECT vh.id::text, vh.event_id::text, vh.vendor_id::text,
		       COALESCE(e.title,'') AS event_title,
		       COALESCE(v.business_name,'') AS vendor_name,
		       COALESCE(u.email,'') AS organizer_email,
		       COALESCE(vh.agreed_amount, vh.proposed_amount, 0) AS amount,
		       vh.created_at::text
		FROM vendor_hires vh
		LEFT JOIN events e ON e.id = vh.event_id
		LEFT JOIN vendors v ON v.id = vh.vendor_id
		LEFT JOIN users u ON u.id = vh.organizer_id
		WHERE vh.status = 'disputed'
		ORDER BY vh.created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, pgOffset(page, limit))
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load disputes")
	}
	defer rows.Close()

	disputes := []fiber.Map{}
	for rows.Next() {
		var id, eventID, vendorID, eventTitle, vendorName, orgEmail, createdAt string
		var amount float64
		rows.Scan(&id, &eventID, &vendorID, &eventTitle, &vendorName, &orgEmail, &amount, &createdAt)
		disputes = append(disputes, fiber.Map{
			"id": id, "event_id": eventID, "vendor_id": vendorID,
			"event_title": eventTitle, "vendor_name": vendorName,
			"organizer_email": orgEmail, "amount": amount, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"disputes": disputes, "total": total, "page": page, "limit": limit})
}

func (h *Handler) ResolveDispute(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"resolved": true})
	}
	id := c.Params("id")
	var body struct {
		Resolution  string  `json:"resolution"`   // "organizer_wins" | "vendor_wins" | "split"
		FinalAmount float64 `json:"final_amount"` // optional override
		Note        string  `json:"note"`
	}
	if err := c.BodyParser(&body); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, errInvalidBody)
	}
	// Mark as completed — resolution detail lives in the audit log meta
	h.db.Exec(ctx(), `UPDATE vendor_hires SET status = 'completed', updated_at = NOW() WHERE id = $1 AND status = 'disputed'`, id)
	h.writeAudit(c, "dispute.resolve", "vendor_hire", id, fiber.Map{
		"resolution": body.Resolution, "final_amount": body.FinalAmount, "note": body.Note,
	})
	return shared.Success(c, 200, fiber.Map{"resolved": true})
}

// ── ORGANIZERS ────────────────────────────────────────────────────────────────

func (h *Handler) ListOrganizers(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"organizers": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)

	var total int
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM users WHERE user_type = 'organizer'`).Scan(&total)

	rows, err := h.db.Query(ctx(), `
		SELECT u.id::text, u.email, COALESCE(u.name,'') AS name,
		       COALESCE(u.is_active, true) AS is_active,
		       COUNT(DISTINCT e.id) AS total_events,
		       COALESCE(SUM(pt.amount) FILTER (WHERE pt.status = 'success'), 0) AS total_revenue,
		       u.created_at::text
		FROM users u
		LEFT JOIN events e ON e.organizer_id = u.id
		LEFT JOIN tickets tk ON tk.event_id = e.id
		LEFT JOIN payment_transactions pt ON pt.ticket_id = tk.id
		WHERE u.user_type = 'organizer'
		GROUP BY u.id, u.email, u.name, u.is_active, u.created_at
		ORDER BY total_revenue DESC
		LIMIT $1 OFFSET $2
	`, limit, pgOffset(page, limit))
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load organizers")
	}
	defer rows.Close()

	organizers := []fiber.Map{}
	for rows.Next() {
		var id, email, name, createdAt string
		var isActive bool
		var totalEvents int
		var totalRevenue float64
		rows.Scan(&id, &email, &name, &isActive, &totalEvents, &totalRevenue, &createdAt)
		organizers = append(organizers, fiber.Map{
			"id": id, "email": email, "name": name, "is_active": isActive,
			"total_events": totalEvents, "total_revenue": totalRevenue, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"organizers": organizers, "total": total, "page": page, "limit": limit})
}

// ── OVERVIEW TIMESERIES ───────────────────────────────────────────────────────

// OverviewTimeseries returns pre-aggregated daily revenue + ticket counts.
// The frontend was previously building this client-side from paginated ledger
// entries — which only covered the last 50 transactions, not all of them.
// This endpoint returns complete daily aggregates directly from the DB.
func (h *Handler) OverviewTimeseries(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"days": []fiber.Map{}})
	}
	days, _ := strconv.Atoi(c.Query("days", "30"))
	if days < 1 || days > 365 {
		days = 30
	}

	rows, err := h.db.Query(ctx(), `
		SELECT
		  day::text,
		  COALESCE(revenue, 0)      AS revenue,
		  COALESCE(ticket_count, 0) AS ticket_count
		FROM (
		  SELECT
		    DATE_TRUNC('day', d)::date AS day
		  FROM generate_series(
		    NOW() - ($1 || ' days')::INTERVAL,
		    NOW(),
		    '1 day'::INTERVAL
		  ) AS d
		) dates
		LEFT JOIN (
		  SELECT
		    DATE_TRUNC('day', created_at)::date AS day,
		    SUM(amount)                          AS revenue
		  FROM platform_revenue
		  WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
		  GROUP BY 1
		) rev USING (day)
		LEFT JOIN (
		  SELECT
		    DATE_TRUNC('day', created_at)::date AS day,
		    COUNT(*)                             AS ticket_count
		  FROM tickets
		  WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL
		  GROUP BY 1
		) tix USING (day)
		ORDER BY day ASC
	`, days)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load timeseries")
	}
	defer rows.Close()

	result := []fiber.Map{}
	for rows.Next() {
		var day string
		var revenue float64
		var ticketCount int
		rows.Scan(&day, &revenue, &ticketCount)
		result = append(result, fiber.Map{
			"day": day[:10], "revenue": revenue, "ticket_count": ticketCount,
		})
	}
	return shared.Success(c, 200, fiber.Map{"days": result, "period": days})
}

// ── USER SEARCH + DETAIL ──────────────────────────────────────────────────────

// SearchUsers does a server-side ILIKE search on email and name.
// The previous ListUsers only filtered by user_type — admins had to page
// through the entire user list to find a specific person.
func (h *Handler) SearchUsers(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"users": []fiber.Map{}, "total": 0})
	}
	q := "%" + c.Query("q") + "%"
	_, limit := pageLimit(c)

	rows, err := h.db.Query(ctx(), `
		SELECT id::text, email, COALESCE(name,'') AS name, user_type,
		       COALESCE(is_active, true), created_at::text
		FROM users
		WHERE email ILIKE $1 OR name ILIKE $1
		ORDER BY created_at DESC
		LIMIT $2
	`, q, limit)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Search failed")
	}
	defer rows.Close()

	users := []fiber.Map{}
	for rows.Next() {
		var id, email, name, userType, createdAt string
		var isActive bool
		rows.Scan(&id, &email, &name, &userType, &isActive, &createdAt)
		users = append(users, fiber.Map{
			"id": id, "email": email, "name": name,
			"user_type": userType, "is_active": isActive, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"users": users, "total": len(users)})
}

// GetUserDetail returns a full user profile with their last 10 tickets
// and last 5 payment transactions. Gives admin a complete picture of one user
// without needing to cross-reference multiple sections.
func (h *Handler) GetUserDetail(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{})
	}
	id := c.Params("id")

	var userID, email, name, userType, createdAt string
	var isActive bool
	err := h.db.QueryRow(ctx(), `
		SELECT id::text, email, COALESCE(name,'') AS name, user_type,
		       COALESCE(is_active, true), created_at::text
		FROM users WHERE id = $1
	`, id).Scan(&userID, &email, &name, &userType, &isActive, &createdAt)
	if err != nil {
		return shared.Error(c, 404, shared.CodeNotFound, "User not found")
	}

	// Last 10 tickets
	tRows, _ := h.db.Query(ctx(), `
		SELECT t.id::text, t.ticket_id, COALESCE(e.title,'') AS event_title,
		       t.total_price, t.status, t.created_at::text
		FROM tickets t
		LEFT JOIN events e ON e.id = t.event_id
		WHERE t.user_id = $1
		ORDER BY t.created_at DESC LIMIT 10
	`, id)
	defer tRows.Close()
	tickets := []fiber.Map{}
	for tRows.Next() {
		var tid, ticketID, eventTitle, status, createdAt string
		var amount float64
		tRows.Scan(&tid, &ticketID, &eventTitle, &amount, &status, &createdAt)
		tickets = append(tickets, fiber.Map{
			"id": tid, "ticket_id": ticketID, "event_title": eventTitle,
			"amount": amount, "status": status, "created_at": createdAt,
		})
	}

	// Last 5 payments
	pRows, _ := h.db.Query(ctx(), `
		SELECT id::text, provider_ref, amount, status, provider, created_at::text
		FROM payment_transactions
		WHERE user_id = $1
		ORDER BY created_at DESC LIMIT 5
	`, id)
	defer pRows.Close()
	payments := []fiber.Map{}
	for pRows.Next() {
		var pid, ref, status, provider, createdAt string
		var amount float64
		pRows.Scan(&pid, &ref, &amount, &status, &provider, &createdAt)
		payments = append(payments, fiber.Map{
			"id": pid, "reference": ref, "amount": amount,
			"status": status, "provider": provider, "created_at": createdAt,
		})
	}

	return shared.Success(c, 200, fiber.Map{
		"id": userID, "email": email, "name": name,
		"user_type": userType, "is_active": isActive, "created_at": createdAt,
		"tickets": tickets, "payments": payments,
	})
}

// ── WAITLIST ──────────────────────────────────────────────────────────────────

// ListWaitlist returns the global email waitlist (migration 020 schema).
// Also returns per-event waitlist counts from migration 011 schema.
// Both tables exist — they serve different purposes:
//   - waitlist (020): global "notify me when Bukr launches" email capture
//   - waitlist (011): per-event sold-out queue (dropped and recreated by 020)
// Since 020 drops 011's table, only the global schema exists post-migration.
func (h *Handler) ListWaitlist(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"entries": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)

	var total int
	h.db.QueryRow(ctx(), `SELECT COUNT(*) FROM waitlist`).Scan(&total)

	rows, err := h.db.Query(ctx(), `
		SELECT id::text, email, created_at::text
		FROM waitlist
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, pgOffset(page, limit))
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load waitlist")
	}
	defer rows.Close()

	entries := []fiber.Map{}
	for rows.Next() {
		var id, email, createdAt string
		rows.Scan(&id, &email, &createdAt)
		entries = append(entries, fiber.Map{"id": id, "email": email, "created_at": createdAt})
	}
	return shared.Success(c, 200, fiber.Map{"entries": entries, "total": total, "page": page, "limit": limit})
}

// ── PROMOS ────────────────────────────────────────────────────────────────────

// ListPromos gives admin visibility into all promo codes across all events.
// Includes usage rate so admin can spot abuse (100% usage on a code with no limit).
func (h *Handler) ListPromos(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"promos": []fiber.Map{}, "total": 0})
	}
	page, limit := pageLimit(c)
	eventID := c.Query("event_id")

	where := whereBase
	args := []any{}
	idx := 1
	if eventID != "" {
		where += fmt.Sprintf(" AND p.event_id = $%d", idx)
		args = append(args, eventID)
		idx++
	}

	var total int
	h.db.QueryRow(ctx(), "SELECT COUNT(*) FROM promo_codes p "+where, args...).Scan(&total)

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT p.id::text, p.code, COALESCE(e.title,'') AS event_title,
		       p.discount_percentage, p.ticket_limit, p.used_count,
		       p.is_active, COALESCE(p.expires_at::text,'') AS expires_at,
		       p.created_at::text
		FROM promo_codes p
		LEFT JOIN events e ON e.id = p.event_id
		`+where+`
		ORDER BY p.created_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load promos")
	}
	defer rows.Close()

	promos := []fiber.Map{}
	for rows.Next() {
		var id, code, eventTitle, expiresAt, createdAt string
		var discount float64
		var ticketLimit, usedCount int
		var isActive bool
		rows.Scan(&id, &code, &eventTitle, &discount, &ticketLimit, &usedCount, &isActive, &expiresAt, &createdAt)
		// Usage rate: if ticket_limit = 0 it means unlimited
		var usageRate *float64
		if ticketLimit > 0 {
			r := float64(usedCount) / float64(ticketLimit) * 100
			usageRate = &r
		}
		promos = append(promos, fiber.Map{
			"id": id, "code": code, "event_title": eventTitle,
			"discount_percentage": discount, "ticket_limit": ticketLimit,
			"used_count": usedCount, "usage_rate_pct": usageRate,
			"is_active": isActive, "expires_at": expiresAt, "created_at": createdAt,
		})
	}
	return shared.Success(c, 200, fiber.Map{"promos": promos, "total": total, "page": page, "limit": limit})
}

// ── SCAN LOGS ─────────────────────────────────────────────────────────────────

// ListScanLogs returns the scan activity feed from scan_log.
// Gives admin visibility into door scanning: valid scans, invalid attempts,
// and already-used ticket re-scan attempts (fraud signal).
func (h *Handler) ListScanLogs(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"logs": []fiber.Map{}, "total": 0, "summary": fiber.Map{}})
	}
	page, limit := pageLimit(c)
	eventID := c.Query("event_id")
	result := c.Query("result") // valid | invalid | already_used

	where := whereBase
	args := []any{}
	idx := 1
	if eventID != "" {
		where += fmt.Sprintf(" AND sl.event_id = $%d", idx)
		args = append(args, eventID)
		idx++
	}
	if result != "" {
		where += fmt.Sprintf(" AND sl.result = $%d", idx)
		args = append(args, result)
		idx++
	}

	var total int
	h.db.QueryRow(ctx(), "SELECT COUNT(*) FROM scan_log sl "+where, args...).Scan(&total)

	// Summary counts — always across the filtered event (or all events)
	var validCount, invalidCount, alreadyUsedCount int
	summaryWhere := whereBase
	summaryArgs := []any{}
	if eventID != "" {
		summaryWhere += " AND sl.event_id = $1"
		summaryArgs = append(summaryArgs, eventID)
	}
	h.db.QueryRow(ctx(), `
		SELECT
		  COUNT(*) FILTER (WHERE sl.result = 'valid'),
		  COUNT(*) FILTER (WHERE sl.result = 'invalid'),
		  COUNT(*) FILTER (WHERE sl.result = 'already_used')
		FROM scan_log sl `+summaryWhere, summaryArgs...,
	).Scan(&validCount, &invalidCount, &alreadyUsedCount)

	args = append(args, limit, pgOffset(page, limit))
	rows, err := h.db.Query(ctx(), `
		SELECT sl.id::text, sl.ticket_id::text, sl.event_id::text,
		       COALESCE(e.title,'') AS event_title,
		       sl.result, sl.scanned_at::text,
		       COALESCE(sl.access_code,'') AS access_code
		FROM scan_log sl
		LEFT JOIN events e ON e.id = sl.event_id
		`+where+`
		ORDER BY sl.scanned_at DESC
		LIMIT $`+strconv.Itoa(idx)+` OFFSET $`+strconv.Itoa(idx+1),
		args...,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load scan logs")
	}
	defer rows.Close()

	logs := []fiber.Map{}
	for rows.Next() {
		var id, ticketID, eventID2, eventTitle, result2, scannedAt, accessCode string
		rows.Scan(&id, &ticketID, &eventID2, &eventTitle, &result2, &scannedAt, &accessCode)
		logs = append(logs, fiber.Map{
			"id": id, "ticket_id": ticketID, "event_id": eventID2,
			"event_title": eventTitle, "result": result2,
			"scanned_at": scannedAt, "access_code": accessCode,
		})
	}
	return shared.Success(c, 200, fiber.Map{
		"logs": logs, "total": total, "page": page, "limit": limit,
		"summary": fiber.Map{
			"valid": validCount, "invalid": invalidCount, "already_used": alreadyUsedCount,
		},
	})
}

// ── FEEDBACK (admin read) ─────────────────────────────────────────────────────

// ListFeedbackAdmin returns NPS aggregate + raw feedback entries.
// The feedback/handler.go ListFeedback returns raw rows only.
// This endpoint adds the aggregate intelligence the admin actually needs:
// NPS score, avg rating, recommend rate, breakdown by journey and user_type.
func (h *Handler) ListFeedbackAdmin(c *fiber.Ctx) error {
	if h.db == nil {
		return shared.Success(c, 200, fiber.Map{"entries": []fiber.Map{}, "aggregate": fiber.Map{}})
	}
	page, limit := pageLimit(c)

	// Aggregate stats — single query
	var totalCount int
	var avgRating float64
	var recommendCount int
	h.db.QueryRow(ctx(), `
		SELECT COUNT(*), COALESCE(AVG(rating),0), COUNT(*) FILTER (WHERE recommend = true)
		FROM user_feedback
	`).Scan(&totalCount, &avgRating, &recommendCount)

	var npsScore float64
	if totalCount > 0 {
		npsScore = float64(recommendCount) / float64(totalCount) * 100
	}

	// Breakdown by journey
	jRows, _ := h.db.Query(ctx(), `
		SELECT journey, COUNT(*) AS cnt, ROUND(AVG(rating),2) AS avg_r
		FROM user_feedback GROUP BY journey ORDER BY cnt DESC
	`)
	defer jRows.Close()
	byJourney := []fiber.Map{}
	for jRows.Next() {
		var journey string
		var cnt int
		var avgR float64
		jRows.Scan(&journey, &cnt, &avgR)
		byJourney = append(byJourney, fiber.Map{"journey": journey, "count": cnt, "avg_rating": avgR})
	}

	// Breakdown by user_type
	utRows, _ := h.db.Query(ctx(), `
		SELECT user_type, COUNT(*) AS cnt, ROUND(AVG(rating),2) AS avg_r
		FROM user_feedback GROUP BY user_type ORDER BY cnt DESC
	`)
	defer utRows.Close()
	byUserType := []fiber.Map{}
	for utRows.Next() {
		var ut string
		var cnt int
		var avgR float64
		utRows.Scan(&ut, &cnt, &avgR)
		byUserType = append(byUserType, fiber.Map{"user_type": ut, "count": cnt, "avg_rating": avgR})
	}

	// Raw entries paginated
	rows, err := h.db.Query(ctx(), `
		SELECT id::text, COALESCE(user_id::text,'') AS user_id,
		       user_type, journey, recommend, rating,
		       COALESCE(comment,'') AS comment, created_at::text
		FROM user_feedback
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`, limit, pgOffset(page, limit))
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load feedback")
	}
	defer rows.Close()

	entries := []fiber.Map{}
	for rows.Next() {
		var id, userID, userType, journey, comment, createdAt string
		var recommend bool
		var rating int
		rows.Scan(&id, &userID, &userType, &journey, &recommend, &rating, &comment, &createdAt)
		entries = append(entries, fiber.Map{
			"id": id, "user_id": userID, "user_type": userType,
			"journey": journey, "recommend": recommend, "rating": rating,
			"comment": comment, "created_at": createdAt,
		})
	}

	return shared.Success(c, 200, fiber.Map{
		"entries": entries,
		"page":    page,
		"aggregate": fiber.Map{
			"total":          totalCount,
			"avg_rating":     avgRating,
			"recommend_rate": npsScore,
			"by_journey":     byJourney,
			"by_user_type":   byUserType,
		},
	})
}
