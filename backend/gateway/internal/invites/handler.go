package invites

import (
	"errors"
	"strings"
	"time"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterOrganizerRoutes mounts organizer-only invite management endpoints.
// All routes require auth + organizer role (enforced by the caller in main.go).
//
//	POST   /events/:id/invites/upload     — bulk upload (multipart file)
//	POST   /events/:id/invites            — bulk upload (JSON body)
//	GET    /events/:id/invites            — list all invites
//	DELETE /events/:id/invites/:invite_id — revoke one invite
//	PUT    /events/:id/access-mode        — set public | invite_only + RSVP deadline
func (h *Handler) RegisterOrganizerRoutes(router fiber.Router) {
	router.Post("/:id/invites/upload", h.BulkUploadFile)
	router.Post("/:id/invites", h.BulkUploadJSON)
	router.Get("/:id/invites", h.ListInvites)
	router.Delete("/:id/invites/:invite_id", h.RevokeInvite)
	router.Put("/:id/access-mode", h.SetAccessMode)
}

// RegisterGuestRoutes mounts the guest-facing redemption endpoint.
// Requires auth (any user type).
//
//	POST /invites/redeem    — guest redeems their token
//	GET  /invites/my-reward — get current user's unused referral reward
func (h *Handler) RegisterGuestRoutes(router fiber.Router) {
	router.Post("/redeem", h.RedeemToken)
	router.Get("/my-reward", h.GetMyReward)
}

// ── Organizer handlers ────────────────────────────────────────────────────────

// BulkUploadFile handles multipart/form-data file uploads (CSV, JSON, DOCX, PDF).
// POST /api/v1/events/:id/invites/upload
func (h *Handler) BulkUploadFile(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	eventID := c.Params("id")
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "file field is required (multipart/form-data)")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to open uploaded file")
	}
	defer file.Close()

	var deadline *time.Time
	if raw := c.FormValue("rsvp_deadline"); raw != "" {
		t, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "rsvp_deadline must be RFC3339 (e.g. 2025-12-01T18:00:00Z)")
		}
		deadline = &t
	}

	result, err := h.svc.BulkUploadFile(c.Context(), eventID, claims.UserID, file, fileHeader, deadline)
	if err != nil {
		return h.mapErr(c, err)
	}

	return shared.Success(c, fiber.StatusOK, result)
}

// BulkUploadJSON handles a JSON body guest list.
// POST /api/v1/events/:id/invites
func (h *Handler) BulkUploadJSON(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req BulkInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}
	if len(req.Guests) == 0 {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "guests array is required and must not be empty")
	}

	result, err := h.svc.BulkUploadJSON(c.Context(), c.Params("id"), claims.UserID, req)
	if err != nil {
		return h.mapErr(c, err)
	}

	return shared.Success(c, fiber.StatusOK, result)
}

// ListInvites returns all invites for an event.
// GET /api/v1/events/:id/invites
func (h *Handler) ListInvites(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	invites, err := h.svc.ListInvites(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		return h.mapErr(c, err)
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"invites": invites, "total": len(invites)})
}

// RevokeInvite revokes a single invite.
// DELETE /api/v1/events/:id/invites/:invite_id
func (h *Handler) RevokeInvite(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	err := h.svc.RevokeInvite(c.Context(), c.Params("invite_id"), c.Params("id"), claims.UserID)
	if err != nil {
		return h.mapErr(c, err)
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Invite revoked"})
}

// SetAccessMode sets the event to public or invite_only with an optional RSVP deadline.
// PUT /api/v1/events/:id/access-mode
func (h *Handler) SetAccessMode(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var body struct {
		Mode         string  `json:"access_mode"`
		RSVPDeadline *string `json:"rsvp_deadline"`
	}
	if err := c.BodyParser(&body); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	var deadline *time.Time
	if body.RSVPDeadline != nil {
		t, err := time.Parse(time.RFC3339, *body.RSVPDeadline)
		if err != nil {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "rsvp_deadline must be RFC3339")
		}
		deadline = &t
	}

	if err := h.svc.SetAccessMode(c.Context(), c.Params("id"), claims.UserID, body.Mode, deadline); err != nil {
		return h.mapErr(c, err)
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"access_mode": body.Mode})
}

// ── Guest handler ─────────────────────────────────────────────────────────────

// RedeemToken is called when a guest taps their invite link.
// POST /api/v1/invites/redeem
func (h *Handler) RedeemToken(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req RedeemRequest
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.Token) == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "token is required")
	}

	resp, err := h.svc.RedeemToken(c.Context(), req.Token, claims.UserID, claims.Email)
	if err != nil {
		// All redemption errors are 403 — never 404 (don't reveal token existence)
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, err.Error())
	}

	return shared.Success(c, fiber.StatusOK, resp)
}

// GetMyReward returns the current user's first unapplied referral reward.
// GET /api/v1/invites/my-reward
func (h *Handler) GetMyReward(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}
	reward, err := h.svc.GetUnusedReward(c.Context(), claims.UserID)
	if err != nil {
		// No reward — return empty 200, not 404, so the frontend doesn't need error handling
		return shared.Success(c, fiber.StatusOK, nil)
	}
	return shared.Success(c, fiber.StatusOK, fiber.Map{
		"id":          reward.ID,
		"reward_type": reward.RewardType,
		"discount_pct": reward.DiscountPct,
		"expires_at":  reward.ExpiresAt,
	})
}

// ── Error mapper ──────────────────────────────────────────────────────────────

func (h *Handler) mapErr(c *fiber.Ctx, err error) error {
	msg := err.Error()
	switch {
	case errors.Is(err, fiber.ErrForbidden) || msg == "forbidden":
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "You do not own this event")
	case msg == "event not found":
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, msg)
	case strings.HasPrefix(msg, "unsupported file type") ||
		strings.HasPrefix(msg, "parse ") ||
		strings.HasPrefix(msg, "rsvp_deadline") ||
		strings.HasPrefix(msg, "access_mode"):
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, msg)
	default:
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, msg)
	}
}
