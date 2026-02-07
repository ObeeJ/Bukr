package favorites

import (
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/", h.List)
	router.Post("/:eventId", h.Add)
	router.Delete("/:eventId", h.Remove)
	router.Get("/:eventId/check", h.Check)
}

// GET /api/v1/favorites
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

// POST /api/v1/favorites/:eventId
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

// DELETE /api/v1/favorites/:eventId
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

// GET /api/v1/favorites/:eventId/check
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
