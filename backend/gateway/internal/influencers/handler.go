package influencers

import (
	"errors"

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
	router.Get("/:id", h.GetByID)
	router.Post("/", h.Create)
	router.Put("/:id", h.Update)
	router.Delete("/:id", h.Delete)
	router.Get("/:id/referral-link", h.GetReferralLink)
}

// GET /api/v1/influencers
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

// GET /api/v1/influencers/:id
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

// POST /api/v1/influencers
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

// PUT /api/v1/influencers/:id
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

// DELETE /api/v1/influencers/:id
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

// GET /api/v1/influencers/:id/referral-link
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
