/**
 * HANDLER LAYER - Free Ticket Claim HTTP Controller
 * 
 * Free Ticket Handler: Users claim free tickets without payment
 * 
 * Architecture Layer: Handler (Layer 2)
 * Dependencies: Event Service (business logic)
 * Responsibility: HTTP request/response, validation, auth checks
 * 
 * Endpoint:
 * - POST /events/:id/claim - Claim free ticket
 */

package events

import (
	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

/**
 * ClaimFreeTicketRequest: Request to claim free ticket
 */
type ClaimFreeTicketRequest struct {
	Quantity int `json:"quantity" validate:"required,min=1,max=10"`
}

/**
 * ClaimFreeTicket: Claim free ticket for event
 * 
 * POST /events/:id/claim
 * Auth: Required (any authenticated user)
 * 
 * Flow:
 * 1. Verify event allows free tickets
 * 2. Check ticket availability
 * 3. Create ticket record
 * 4. Return ticket with QR code
 */
func (h *Handler) ClaimFreeTicket(c *fiber.Ctx) error {
	// Get event ID from URL
	eventID := c.Params("id")
	if eventID == "" {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Event ID required")
	}

	// Get current user
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	// Parse request
	var req ClaimFreeTicketRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	// Validate quantity
	if req.Quantity < 1 || req.Quantity > 10 {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Quantity must be between 1 and 10")
	}

	// Claim free ticket
	ticket, err := h.service.ClaimFreeTicket(c.Context(), eventID, claims.UserID, req.Quantity)
	if err != nil {
		// Check specific error types
		if err.Error() == "this event requires payment" {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, err.Error())
		}
		if err.Error() == "insufficient tickets available" {
			return shared.Error(c, fiber.StatusConflict, shared.CodeConflict, err.Error())
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(shared.APIResponse{
		Status:  "success",
		Data:    fiber.Map{"message": "Free ticket claimed successfully", "ticket": ticket},
	})
}
