/**
 * CONTROLLER LAYER - Event HTTP Handlers
 * 
 * Event Handler: The event orchestrator - managing event lifecycle
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: Service layer (event business logic)
 * Responsibility: HTTP request/response handling for events
 * 
 * Public Endpoints (no auth):
 * - GET /api/v1/events: List/search events
 * - GET /api/v1/events/categories: Get event categories
 * - GET /api/v1/events/:id: Get event by ID
 * - GET /api/v1/events/key/:eventKey: Get event by URL slug
 * 
 * Protected Endpoints (auth required):
 * - GET /api/v1/events/me: List organizer's events
 * - POST /api/v1/events: Create event (organizer only)
 * - PUT /api/v1/events/:id: Update event (owner only)
 * - DELETE /api/v1/events/:id: Delete event (owner only)
 * 
 * Features:
 * - Pagination (page, limit)
 * - Filtering (category, status)
 * - Search (title, description, location)
 * - URL-friendly slugs (event_key)
 */

package events

import (
	"errors"
	"strconv"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

/**
 * Handler: Event controller
 */
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

/**
 * RegisterPublicRoutes: Mount public event endpoints
 */
func (h *Handler) RegisterPublicRoutes(router fiber.Router) {
	router.Get("/", h.ListEvents)
	router.Get("/search", h.ListEvents)    // Same handler, uses query params
	router.Get("/categories", h.GetCategories)
	router.Get("/key/:eventKey", h.GetByEventKey)
	router.Get("/:id", h.GetByID)
}

/**
 * RegisterProtectedRoutes: Mount organizer-only endpoints
 */
func (h *Handler) RegisterProtectedRoutes(router fiber.Router) {
	router.Get("/me", h.ListMyEvents)
	router.Post("/", h.CreateEvent)
	router.Put("/:id", h.UpdateEvent)
	router.Delete("/:id", h.DeleteEvent)
	
	// Free ticket claiming handled by proxy - just validate here
	// Actual route registered in main.go to proxy to Rust
	
	// Scanner management (organizer only)
	router.Post("/:id/scanners", h.AssignScanner)
	router.Get("/:id/scanners", h.ListScanners)
	router.Delete("/:id/scanners/:scanner_id", h.RemoveScanner)
}

/**
 * ListEvents: List/search events with pagination
 * 
 * GET /api/v1/events?page=1&limit=20&category=music&status=active&search=concert
 * 
 * Query params:
 * - page: Page number (default 1)
 * - limit: Items per page (default 20, max 50)
 * - category: Filter by category
 * - status: Filter by status (default active)
 * - search: Search title/description/location
 */
func (h *Handler) ListEvents(c *fiber.Ctx) error {
	q := ListEventsQuery{
		Page:     queryInt(c, "page", 1),
		Limit:    queryInt(c, "limit", 20),
		Category: c.Query("category"),
		Status:   c.Query("status"),
		Search:   c.Query("search"),
	}

	result, err := h.service.List(c.Context(), q)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to list events")
	}

	return shared.Success(c, fiber.StatusOK, result)
}

/**
 * GetCategories: Get distinct event categories
 * 
 * GET /api/v1/events/categories
 * Returns list of active event categories
 */
func (h *Handler) GetCategories(c *fiber.Ctx) error {
	categories, err := h.service.GetCategories(c.Context())
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get categories")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"categories": categories})
}

/**
 * GetByID: Get event by UUID
 * 
 * GET /api/v1/events/:id
 */
func (h *Handler) GetByID(c *fiber.Ctx) error {
	id := c.Params("id")

	event, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get event")
	}

	return shared.Success(c, fiber.StatusOK, event)
}

/**
 * GetByEventKey: Get event by URL slug
 * 
 * GET /api/v1/events/key/:eventKey
 * Example: /api/v1/events/key/summer-fest-2024-a3f2
 */
func (h *Handler) GetByEventKey(c *fiber.Ctx) error {
	eventKey := c.Params("eventKey")

	event, err := h.service.GetByEventKey(c.Context(), eventKey)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get event")
	}

	return shared.Success(c, fiber.StatusOK, event)
}

/**
 * ListMyEvents: List organizer's events
 * 
 * GET /api/v1/events/me?page=1&limit=20
 * Requires authentication, organizer only
 */
func (h *Handler) ListMyEvents(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}

	page := queryInt(c, "page", 1)
	limit := queryInt(c, "limit", 20)

	result, err := h.service.ListByOrganizer(c.Context(), claims.UserID, page, limit)
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to list events")
	}

	return shared.Success(c, fiber.StatusOK, result)
}

/**
 * CreateEvent: Create new event
 * 
 * POST /api/v1/events
 * Requires authentication, organizer only
 * Generates unique event_key from title
 */
func (h *Handler) CreateEvent(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}
	if claims.UserType != "organizer" {
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Organizer access required")
	}

	var req CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	event, err := h.service.Create(c.Context(), claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrValidation) {
			return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Missing required fields: title, date, time, location, total_tickets")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to create event")
	}

	return shared.Success(c, fiber.StatusCreated, event)
}

/**
 * UpdateEvent: Update event details
 * 
 * PUT /api/v1/events/:id
 * Requires authentication, owner only
 */
func (h *Handler) UpdateEvent(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}
	if claims.UserType != "organizer" {
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Organizer access required")
	}

	id := c.Params("id")

	var req UpdateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}

	event, err := h.service.Update(c.Context(), id, claims.UserID, req)
	if err != nil {
		if errors.Is(err, shared.ErrNotFound) {
			return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found or not owned by you")
		}
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to update event")
	}

	return shared.Success(c, fiber.StatusOK, event)
}

/**
 * DeleteEvent: Delete event
 * 
 * DELETE /api/v1/events/:id
 * Requires authentication, owner only
 */
func (h *Handler) DeleteEvent(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
	}
	if claims.UserType != "organizer" {
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Organizer access required")
	}

	id := c.Params("id")

	if err := h.service.Delete(c.Context(), id, claims.UserID); err != nil {
		return shared.Error(c, fiber.StatusNotFound, shared.CodeNotFound, "Event not found or not owned by you")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Event deleted"})
}

/**
 * queryInt: Helper to parse integer query params
 */
func queryInt(c *fiber.Ctx, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	n, err := strconv.Atoi(val)
	if err != nil || n < 1 {
		return defaultVal
	}
	return n
}
