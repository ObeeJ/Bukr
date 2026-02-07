package users

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
	router.Get("/me", h.GetProfile)
	router.Patch("/me", h.UpdateProfile)
	router.Post("/me/complete", h.CompleteProfile)
	router.Delete("/me", h.DeactivateAccount)
}

// GET /api/v1/users/me
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	user, err := h.service.GetProfile(c.Context(), claims.UserID)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "User not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get profile")
	}

	return shared.Success(c, fiber.StatusOK, user)
}

// PATCH /api/v1/users/me
func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	user, err := h.service.UpdateProfile(c.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "User not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to update profile")
	}

	return shared.Success(c, fiber.StatusOK, user)
}

// POST /api/v1/users/me/complete — called after Supabase signup to set user_type
func (h *Handler) CompleteProfile(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	var req CompleteProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	if req.Name == "" || req.UserType == "" {
		return shared.ValidationError(c, []shared.FieldError{
			{Field: "name", Message: "Name is required"},
			{Field: "user_type", Message: "User type is required"},
		})
	}

	user, err := h.service.CompleteProfile(c.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrValidation) {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid user type or missing org name")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to complete profile")
	}

	return shared.Success(c, fiber.StatusOK, user)
}

// DELETE /api/v1/users/me
func (h *Handler) DeactivateAccount(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	if err := h.service.DeactivateAccount(c.Context(), claims.UserID); err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to deactivate account")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Account deactivated"})
}
