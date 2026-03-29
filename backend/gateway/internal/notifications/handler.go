// HTTP handlers for in-app notifications.
//
// Routes (all require userAuth middleware):
//   GET    /notifications                  — list user's notifications (newest first)
//   PATCH  /notifications/:id/read         — mark one read
//   PATCH  /notifications/read-all         — mark all read
//   GET    /notifications/preferences      — get preferences (creates row if missing)
//   PATCH  /notifications/preferences      — update preferences

package notifications

import (
	"context"
	"time"

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

func (h *Handler) RegisterRoutes(router fiber.Router) {
	// /read-all must be registered before /:id/read — Fiber matches first registered.
	router.Patch("/read-all", h.MarkAllRead)
	router.Get("/preferences", h.GetPreferences)
	router.Patch("/preferences", h.UpdatePreferences)
	router.Get("/", h.List)
	router.Patch("/:id/read", h.MarkRead)
}

// ── Response shapes ───────────────────────────────────────────────────────────

type notificationRow struct {
	ID               string  `json:"id"`
	TicketID         *string `json:"ticket_id"`
	EventID          *string `json:"event_id"`
	NotificationType string  `json:"notification_type"`
	Message          *string `json:"message"`
	IsRead           bool    `json:"is_read"`
	SentAt           *string `json:"sent_at"`
	CreatedAt        string  `json:"created_at"`
}

type prefsRow struct {
	ScanConfirmed bool `json:"scan_confirmed"`
	UsageDepleted bool `json:"usage_depleted"`
	ExpiryWarning bool `json:"expiry_warning"`
	Expired       bool `json:"expired"`
	RenewalPrompt bool `json:"renewal_prompt"`
}

// ── Handlers ──────────────────────────────────────────────────────────────────

// List returns the 50 most recent notifications for the authenticated user.
func (h *Handler) List(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	rows, err := h.db.Query(ctx, `
		SELECT id, ticket_id, event_id, type, message, is_read, sent_at, created_at
		FROM ticket_notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 50
	`, claims.UserID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to fetch notifications")
	}
	defer rows.Close()

	results := make([]notificationRow, 0)
	for rows.Next() {
		var r notificationRow
		var createdAt time.Time
		var sentAt *time.Time
		if err := rows.Scan(&r.ID, &r.TicketID, &r.EventID, &r.NotificationType,
			&r.Message, &r.IsRead, &sentAt, &createdAt); err != nil {
			continue
		}
		r.CreatedAt = createdAt.Format(time.RFC3339)
		if sentAt != nil {
			s := sentAt.Format(time.RFC3339)
			r.SentAt = &s
		}
		results = append(results, r)
	}

	return shared.Success(c, fiber.StatusOK, results)
}

// MarkRead marks a single notification as read. Only the owner can mark their own.
func (h *Handler) MarkRead(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	id := c.Params("id")
	if id == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Notification ID required")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	tag, err := h.db.Exec(ctx,
		`UPDATE ticket_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
		id, claims.UserID,
	)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to update notification")
	}
	if tag.RowsAffected() == 0 {
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Notification not found")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Marked as read"})
}

// MarkAllRead marks every unread notification for the user as read.
func (h *Handler) MarkAllRead(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	_, err := h.db.Exec(ctx,
		`UPDATE ticket_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
		claims.UserID,
	)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to update notifications")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "All marked as read"})
}

// GetPreferences returns the user's notification preferences.
// Creates a default row if one doesn't exist yet (lazy init).
func (h *Handler) GetPreferences(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	// Upsert default row so the SELECT always returns a row.
	_, err := h.db.Exec(ctx, `
		INSERT INTO notification_preferences (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO NOTHING
	`, claims.UserID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to load preferences")
	}

	var p prefsRow
	err = h.db.QueryRow(ctx, `
		SELECT scan_confirmed, usage_depleted, expiry_warning, expired, renewal_prompt
		FROM notification_preferences
		WHERE user_id = $1
	`, claims.UserID).Scan(&p.ScanConfirmed, &p.UsageDepleted, &p.ExpiryWarning, &p.Expired, &p.RenewalPrompt)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to load preferences")
	}

	return shared.Success(c, fiber.StatusOK, p)
}

// UpdatePreferences updates the user's notification preferences.
func (h *Handler) UpdatePreferences(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req prefsRow
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	_, err := h.db.Exec(ctx, `
		INSERT INTO notification_preferences
			(user_id, scan_confirmed, usage_depleted, expiry_warning, expired, renewal_prompt, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			scan_confirmed = EXCLUDED.scan_confirmed,
			usage_depleted = EXCLUDED.usage_depleted,
			expiry_warning = EXCLUDED.expiry_warning,
			expired        = EXCLUDED.expired,
			renewal_prompt = EXCLUDED.renewal_prompt,
			updated_at     = NOW()
	`, claims.UserID, req.ScanConfirmed, req.UsageDepleted, req.ExpiryWarning, req.Expired, req.RenewalPrompt)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to save preferences")
	}

	return shared.Success(c, fiber.StatusOK, req)
}
