/**
 * CONTROLLER LAYER - Favorites HTTP Handlers
 * 
 * Favorites Handler: The bookmark manager - saving events for later
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Service layer (favorites business logic)
 * Responsibility: HTTP request/response handling for favorites
 * 
 * Endpoints:
 * - GET /api/v1/favorites: List user's favorited events
 * - POST /api/v1/favorites/:eventId: Add event to favorites
 * - DELETE /api/v1/favorites/:eventId: Remove from favorites
 * - GET /api/v1/favorites/:eventId/check: Check if event is favorited
 * 
 * Use Cases:
 * 1. User saves interesting events for later
 * 2. User views their saved events
 * 3. User removes events from favorites
 * 4. UI checks if event is already favorited (heart icon state)
 */

package favorites

import (
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

/**
 * Handler: Favorites controller
 */
type Handler struct {
	service *Service
}

/**
 * NewHandler: Constructor
 */
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

/**
 * RegisterRoutes: Mount favorites endpoints
 */
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.List)
	router.Post("/:eventId", h.Add)
	router.Delete("/:eventId", h.Remove)
	router.Get("/:eventId/check", h.Check)
}

/**
 * List: Get user's favorited events
 * 
 * GET /api/v1/favorites
 * Returns full event details for each favorited event
 */
func (h *Handler) List(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	events, err := h.service.List(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to list favorites")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"events": events})
}

/**
 * Add: Add event to favorites
 * 
 * POST /api/v1/favorites/:eventId
 * Idempotent: adding twice has same effect as once
 */
func (h *Handler) Add(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	eventID := c.Params("eventId")
	result, err := h.service.Add(c.Context(), claims.UserID, eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to add favorite")
	}

	return shared.Success(c, fiber.StatusCreated, result)
}

/**
 * Remove: Remove event from favorites
 * 
 * DELETE /api/v1/favorites/:eventId
 * Idempotent: removing twice has same effect as once
 */
func (h *Handler) Remove(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	eventID := c.Params("eventId")
	result, err := h.service.Remove(c.Context(), claims.UserID, eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to remove favorite")
	}

	return shared.Success(c, fiber.StatusOK, result)
}

/**
 * Check: Check if event is favorited
 * 
 * GET /api/v1/favorites/:eventId/check
 * Used by UI to show heart icon state (filled vs outline)
 */
func (h *Handler) Check(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	eventID := c.Params("eventId")
	favorited, err := h.service.IsFavorited(c.Context(), claims.UserID, eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to check favorite")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"favorited": favorited})
}
