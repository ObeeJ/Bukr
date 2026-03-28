/**
 * HANDLER LAYER - Waitlist & User Feedback
 *
 * POST /waitlist       — public, idempotent email capture
 * POST /feedback       — authenticated, fire-and-forget from frontend
 * GET  /admin/feedback — admin only, paginated read
 */

package feedback

import (
	"context"
	"strings"
	"time"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

type WaitlistRequest struct {
	Email string `json:"email"`
}

type FeedbackRequest struct {
	UserType  string  `json:"user_type"`
	Journey   string  `json:"journey"`
	Recommend bool    `json:"recommend"`
	Rating    int     `json:"rating"`
	Comment   *string `json:"comment,omitempty"`
}

type Handler struct {
	db *pgxpool.Pool
}

func NewHandler(db *pgxpool.Pool) *Handler {
	return &Handler{db: db}
}

func (h *Handler) RegisterRoutes(public fiber.Router, protected fiber.Router, admin fiber.Router) {
	public.Post("/waitlist", h.JoinWaitlist)
	protected.Post("/", h.SubmitFeedback)
	admin.Get("/feedback", h.ListFeedback)
}

// JoinWaitlist — idempotent, ON CONFLICT DO NOTHING so duplicate emails are silent.
func (h *Handler) JoinWaitlist(c *fiber.Ctx) error {
	var req WaitlistRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	email := strings.TrimSpace(strings.ToLower(req.Email))
	if email == "" || !strings.Contains(email, "@") {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Valid email required")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	_, err := h.db.Exec(ctx,
		`INSERT INTO waitlist (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`,
		email,
	)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to join waitlist")
	}

	return c.Status(fiber.StatusCreated).JSON(shared.APIResponse{
		Status: "success",
		Data:   fiber.Map{"message": "You're on the list."},
	})
}

var validUserTypes = map[string]bool{
	"user": true, "organizer": true, "vendor": true, "influencer": true, "scanner": true,
}
var validJourneys = map[string]bool{
	"ticket_purchased": true, "event_created": true,
	"vendor_registered": true, "payout_requested": true, "scan_session_ended": true,
}

// SubmitFeedback — authenticated, validates all fields, stores and returns immediately.
func (h *Handler) SubmitFeedback(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req FeedbackRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	if !validUserTypes[req.UserType] {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid user_type")
	}
	if !validJourneys[req.Journey] {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid journey")
	}
	if req.Rating < 1 || req.Rating > 5 {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Rating must be 1-5")
	}
	if req.Comment != nil && len(*req.Comment) > 120 {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Comment exceeds 120 characters")
	}

	ctx, cancel := context.WithTimeout(c.Context(), 5*time.Second)
	defer cancel()

	_, err := h.db.Exec(ctx,
		`INSERT INTO user_feedback (user_id, user_type, journey, recommend, rating, comment)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		claims.UserID, req.UserType, req.Journey, req.Recommend, req.Rating, req.Comment,
	)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to save feedback")
	}

	return c.Status(fiber.StatusCreated).JSON(shared.APIResponse{
		Status: "success",
		Data:   fiber.Map{"message": "Feedback received."},
	})
}

// ListFeedback — admin only, newest first, 50 per page.
func (h *Handler) ListFeedback(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	if page < 1 {
		page = 1
	}
	limit := 50
	offset := (page - 1) * limit

	ctx, cancel := context.WithTimeout(c.Context(), 8*time.Second)
	defer cancel()

	rows, err := h.db.Query(ctx,
		`SELECT id, user_id, user_type, journey, recommend, rating, comment, created_at
		 FROM user_feedback
		 ORDER BY created_at DESC
		 LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to fetch feedback")
	}
	defer rows.Close()

	type Row struct {
		ID        string  `json:"id"`
		UserID    *string `json:"user_id"`
		UserType  string  `json:"user_type"`
		Journey   string  `json:"journey"`
		Recommend bool    `json:"recommend"`
		Rating    int     `json:"rating"`
		Comment   *string `json:"comment"`
		CreatedAt string  `json:"created_at"`
	}

	results := make([]Row, 0)
	for rows.Next() {
		var r Row
		var createdAt time.Time
		if err := rows.Scan(&r.ID, &r.UserID, &r.UserType, &r.Journey,
			&r.Recommend, &r.Rating, &r.Comment, &createdAt); err != nil {
			continue
		}
		r.CreatedAt = createdAt.Format(time.RFC3339)
		results = append(results, r)
	}

	return c.JSON(shared.APIResponse{
		Status: "success",
		Data:   fiber.Map{"feedback": results, "page": page},
	})
}
