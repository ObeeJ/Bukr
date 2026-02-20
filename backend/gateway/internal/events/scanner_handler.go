/**
 * HANDLER LAYER - Scanner Assignment HTTP Controllers
 * 
 * Scanner Handler: Organizer assigns users as scanners for events
 * 
 * Architecture Layer: Handler (Layer 2)
 * Dependencies: Scanner Service (business logic)
 * Responsibility: HTTP request/response, validation, auth checks
 * 
 * Endpoints:
 * - POST /events/:id/scanners - Assign scanner to event
 * - GET /events/:id/scanners - List scanners for event
 * - DELETE /events/:id/scanners/:scanner_id - Remove scanner
 */

package events

import (
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

/**
 * AssignScannerRequest: Request to assign scanner
 */
type AssignScannerRequest struct {
	ScannerEmail string  `json:"scanner_email" validate:"required,email"`
	ExpiresAt    *string `json:"expires_at,omitempty"` // Optional expiration
}

/**
 * ScannerAssignment: Scanner assignment response
 */
type ScannerAssignment struct {
	ID            string  `json:"id"`
	EventID       string  `json:"event_id"`
	ScannerUserID string  `json:"scanner_user_id"`
	ScannerName   string  `json:"scanner_name"`
	ScannerEmail  string  `json:"scanner_email"`
	AssignedBy    string  `json:"assigned_by"`
	IsActive      bool    `json:"is_active"`
	CreatedAt     string  `json:"created_at"`
	ExpiresAt     *string `json:"expires_at,omitempty"`
}

/**
 * AssignScanner: Assign user as scanner for event
 * 
 * POST /events/:id/scanners
 * Auth: Organizer only (must own event)
 */
func (h *Handler) AssignScanner(c *fiber.Ctx) error {
	// Get event ID from URL
	eventID := c.Params("id")
	if eventID == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Event ID required")
	}

	// Get current user (organizer)
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Parse request
	var req AssignScannerRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	// Validate email
	if req.ScannerEmail == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Scanner email required")
	}

	// Verify organizer owns event
	event, err := h.service.GetByID(c.Context(), eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found")
	}
	if event.OrganizerID != claims.UserID {
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Not event organizer")
	}

	// Assign scanner
	assignment, err := h.service.AssignScanner(c.Context(), eventID, claims.UserID, req.ScannerEmail, req.ExpiresAt)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(shared.APIResponse{
		Status: "success",
		Data:   assignment,
	})
}

/**
 * ListScanners: List all scanners for event
 * 
 * GET /events/:id/scanners
 * Auth: Organizer only (must own event)
 */
func (h *Handler) ListScanners(c *fiber.Ctx) error {
	// Get event ID from URL
	eventID := c.Params("id")
	if eventID == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Event ID required")
	}

	// Get current user (organizer)
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Verify organizer owns event
	event, err := h.service.GetByID(c.Context(), eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found")
	}
	if event.OrganizerID != claims.UserID {
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Not event organizer")
	}

	// Get scanners
	scanners, err := h.service.ListScanners(c.Context(), eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, err.Error())
	}

	return c.JSON(shared.APIResponse{
		Status: "success",
		Data:   fiber.Map{"scanners": scanners},
	})
}

/**
 * RemoveScanner: Remove scanner assignment
 * 
 * DELETE /events/:id/scanners/:scanner_id
 * Auth: Organizer only (must own event)
 */
func (h *Handler) RemoveScanner(c *fiber.Ctx) error {
	// Get IDs from URL
	eventID := c.Params("id")
	scannerID := c.Params("scanner_id")
	if eventID == "" || scannerID == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Event ID and Scanner ID required")
	}

	// Get current user (organizer)
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Verify organizer owns event
	event, err := h.service.GetByID(c.Context(), eventID)
	if err != nil {
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found")
	}
	if event.OrganizerID != claims.UserID {
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Not event organizer")
	}

	// Remove scanner
	if err := h.service.RemoveScanner(c.Context(), eventID, scannerID); err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, err.Error())
	}

	return c.JSON(shared.APIResponse{
		Status:  "success",
		Data:    fiber.Map{"message": "Scanner removed successfully"},
	})
}
