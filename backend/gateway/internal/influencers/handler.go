/**
 * CONTROLLER LAYER - Influencer HTTP Handlers
 * 
 * Influencer Handler: The affiliate manager - tracking referral partners
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Service layer (influencer business logic)
 * Responsibility: HTTP request/response handling for influencers
 * 
 * Endpoints:
 * - GET /api/v1/influencers: List organizer's influencers
 * - GET /api/v1/influencers/:id: Get influencer details
 * - POST /api/v1/influencers: Create new influencer
 * - PUT /api/v1/influencers/:id: Update influencer
 * - DELETE /api/v1/influencers/:id: Delete influencer
 * - GET /api/v1/influencers/:id/referral-link: Get referral link
 * 
 * Use Cases:
 * 1. Organizers create influencer profiles
 * 2. Generate unique referral links for tracking
 * 3. Track ticket sales via influencer codes
 * 4. Calculate commissions/rewards
 */

package influencers

import (
	"errors"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

/**
 * Handler: Influencer controller
 */
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

/**
 * RegisterRoutes: Mount influencer endpoints
 */
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.List)
	router.Get("/:id", h.GetByID)
	router.Post("/", h.Create)
	router.Put("/:id", h.Update)
	router.Delete("/:id", h.Delete)
	router.Get("/:id/referral-link", h.GetReferralLink)
}

/**
 * List: Get organizer's influencers
 * 
 * GET /api/v1/influencers
 * Only returns influencers owned by authenticated organizer
 */
func (h *Handler) List(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	influencers, err := h.service.List(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to list influencers")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"influencers": influencers})
}

/**
 * GetByID: Get influencer details
 * 
 * GET /api/v1/influencers/:id
 * Includes referral stats (clicks, conversions, revenue)
 */
func (h *Handler) GetByID(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	inf, err := h.service.GetByID(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Influencer not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get influencer")
	}

	return shared.Success(c, fiber.StatusOK, inf)
}

/**
 * Create: Create new influencer
 * 
 * POST /api/v1/influencers
 * Generates unique referral code
 */
func (h *Handler) Create(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req CreateInfluencerRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	inf, err := h.service.Create(c.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrValidation) {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Name and email are required")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to create influencer")
	}

	return shared.Success(c, fiber.StatusCreated, inf)
}

/**
 * Update: Update influencer details
 * 
 * PUT /api/v1/influencers/:id
 * Partial update (only provided fields)
 */
func (h *Handler) Update(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req UpdateInfluencerRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	inf, err := h.service.Update(c.Context(), c.Params("id"), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Influencer not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to update influencer")
	}

	return shared.Success(c, fiber.StatusOK, inf)
}

/**
 * Delete: Delete influencer
 * 
 * DELETE /api/v1/influencers/:id
 * Only owner can delete
 */
func (h *Handler) Delete(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	if err := h.service.Delete(c.Context(), c.Params("id"), claims.UserID); err != nil {
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Influencer not found")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Influencer deleted"})
}

/**
 * GetReferralLink: Generate referral link
 * 
 * GET /api/v1/influencers/:id/referral-link
 * Returns shareable link with tracking code
 * Format: https://bukr.app/events?ref=INFLUENCER_CODE
 */
func (h *Handler) GetReferralLink(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	link, err := h.service.GetReferralLink(c.Context(), c.Params("id"), claims.UserID)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Influencer not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to generate referral link")
	}

	return shared.Success(c, fiber.StatusOK, link)
}
