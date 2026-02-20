/**
 * CONTROLLER LAYER - User Profile HTTP Handlers
 * 
 * User Handler: The profile manager - handling user account operations
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Service layer (user business logic)
 * Responsibility: HTTP request/response handling for user operations
 * 
 * Endpoints:
 * - GET /api/v1/users/me: Get current user profile
 * - PATCH /api/v1/users/me: Update profile fields
 * - POST /api/v1/users/me/complete: Complete profile after signup
 * - DELETE /api/v1/users/me: Deactivate account
 * 
 * Authentication:
 * All endpoints require JWT authentication via middleware
 * User ID extracted from JWT claims
 * 
 * Use Cases:
 * 1. User views their profile
 * 2. User updates name, phone, org name
 * 3. User completes profile after Supabase signup (set user_type)
 * 4. User deactivates account (soft delete)
 */

package users

import (
	"errors"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

/**
 * Handler: User profile controller
 * 
 * Handles HTTP requests for user operations
 * Delegates business logic to service layer
 */
type Handler struct {
	service *Service    // Business logic layer
}

/**
 * NewHandler: Constructor for user handler
 * 
 * @param service - User service instance
 * @returns Handler instance
 */
func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

/**
 * RegisterRoutes: Register user endpoints
 * 
 * Mounts all user routes under /api/v1/users
 * All routes require authentication middleware
 * 
 * @param router - Fiber router instance
 */
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/me", h.GetProfile)
	router.Patch("/me", h.UpdateProfile)
	router.Post("/me/complete", h.CompleteProfile)
	router.Delete("/me", h.DeactivateAccount)
}

/**
 * GetProfile: Retrieve current user profile
 * 
 * GET /api/v1/users/me
 * 
 * Flow:
 * 1. Extract user ID from JWT claims
 * 2. Fetch user from database
 * 3. Return user profile
 * 
 * @param c - Fiber context
 * @returns User profile or error
 */
func (h *Handler) GetProfile(c *fiber.Ctx) error {
	// Extract authenticated user from JWT
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Fetch user profile from service
	user, err := h.service.GetProfile(c.Context(), claims.UserID)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "User not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get profile")
	}

	return shared.Success(c, fiber.StatusOK, user)
}

/**
 * UpdateProfile: Update user profile fields
 * 
 * PATCH /api/v1/users/me
 * 
 * Updatable fields:
 * - name: User's display name
 * - phone: Phone number
 * - org_name: Organization name (for organizers)
 * 
 * @param c - Fiber context
 * @returns Updated user profile or error
 */
func (h *Handler) UpdateProfile(c *fiber.Ctx) error {
	// Extract authenticated user
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Parse request body
	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	// Update profile via service
	user, err := h.service.UpdateProfile(c.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "User not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to update profile")
	}

	return shared.Success(c, fiber.StatusOK, user)
}

/**
 * CompleteProfile: Complete profile after Supabase signup
 * 
 * POST /api/v1/users/me/complete
 * 
 * Called after user signs up via Supabase
 * Sets user_type (user or organizer) and required fields
 * 
 * Required fields:
 * - name: User's display name
 * - user_type: "user" or "organizer"
 * - org_name: Required if user_type is "organizer"
 * 
 * @param c - Fiber context
 * @returns Completed user profile or error
 */
func (h *Handler) CompleteProfile(c *fiber.Ctx) error {
	// Extract authenticated user
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Parse request body
	var req CompleteProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	// Validate required fields
	if req.Name == "" || req.UserType == "" {
		return shared.ValidationError(c, []shared.FieldError{
			{Field: "name", Message: "Name is required"},
			{Field: "user_type", Message: "User type is required"},
		})
	}

	// Complete profile via service
	user, err := h.service.CompleteProfile(c.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrValidation) {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid user type or missing org name")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to complete profile")
	}

	return shared.Success(c, fiber.StatusOK, user)
}

/**
 * DeactivateAccount: Soft delete user account
 * 
 * DELETE /api/v1/users/me
 * 
 * Sets is_active = false (soft delete)
 * User can no longer login or access resources
 * Data retained for audit purposes
 * 
 * @param c - Fiber context
 * @returns Success confirmation or error
 */
func (h *Handler) DeactivateAccount(c *fiber.Ctx) error {
	// Extract authenticated user
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Deactivate account via service
	if err := h.service.DeactivateAccount(c.Context(), claims.UserID); err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to deactivate account")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Account deactivated"})
}
