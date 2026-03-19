package influencer_portal

import (
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	repo *Repository
}

func NewHandler(repo *Repository) *Handler {
	return &Handler{repo: repo}
}

// RegisterRoutes mounts all influencer portal endpoints.
// All routes require auth. Claim is open to any logged-in user (not just influencer type).
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/me", h.GetProfile)
	router.Get("/me/links", h.GetLinks)
	router.Get("/me/payouts", h.GetPayoutHistory)
	router.Post("/me/payout", h.RequestPayout)
}

func (h *Handler) RegisterClaimRoute(router fiber.Router) {
	router.Post("/claim/:token", h.Claim)
}

// GET /api/v1/influencer/me
// Returns the influencer's profile and earnings summary.
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	profile, err := h.repo.GetProfileByUserID(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, 404, shared.CodeNotFound, "Influencer profile not found. Ask your organizer to send you an invite link.")
	}
	return shared.Success(c, 200, profile)
}

// GET /api/v1/influencer/me/links
// Returns all events this influencer is linked to with per-event stats.
func (h *Handler) GetLinks(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	// Resolve influencer ID from user ID
	profile, err := h.repo.GetProfileByUserID(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, 404, shared.CodeNotFound, "Influencer profile not found")
	}

	links, err := h.repo.GetReferralLinks(c.Context(), profile.ID)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load referral links")
	}
	return shared.Success(c, 200, LinksResponse{Links: links})
}

// GET /api/v1/influencer/me/payouts
// Returns payout request history.
func (h *Handler) GetPayoutHistory(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	profile, err := h.repo.GetProfileByUserID(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, 404, shared.CodeNotFound, "Influencer profile not found")
	}

	history, err := h.repo.GetPayoutHistory(c.Context(), profile.ID)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load payout history")
	}
	return shared.Success(c, 200, fiber.Map{"payouts": history})
}

// POST /api/v1/influencer/me/payout
// Submits a payout request. Minimum ₦5,000.
func (h *Handler) RequestPayout(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	var req PayoutRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, "Invalid request body")
	}
	if req.Amount < 5000 {
		return shared.Error(c, 400, shared.CodeValidationError, "Minimum payout is ₦5,000")
	}
	if req.BankCode == "" || req.AccountNumber == "" || req.AccountName == "" {
		return shared.Error(c, 400, shared.CodeValidationError, "Bank details are required")
	}

	profile, err := h.repo.GetProfileByUserID(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, 404, shared.CodeNotFound, "Influencer profile not found")
	}

	if err := h.repo.RequestPayout(c.Context(), profile.ID, req); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, err.Error())
	}
	return shared.Success(c, 201, fiber.Map{"message": "Payout request submitted. Admin will process within 2 business days."})
}

// POST /api/v1/influencer/claim/:token
// Links a logged-in user to their organizer-created influencer record.
// Any authenticated user can call this — not restricted to influencer type.
func (h *Handler) Claim(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	token := c.Params("token")
	if token == "" {
		return shared.Error(c, 400, shared.CodeValidationError, "Token is required")
	}

	if err := h.repo.ClaimByToken(c.Context(), token, claims.UserID); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, err.Error())
	}
	return shared.Success(c, 200, fiber.Map{"message": "Portal claimed successfully. Welcome to Bukr."})
}
