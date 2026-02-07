package events

import (
	"errors"
	"strconv"

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

func (h *Handler) RegisterPublicRoutes(router fiber.Router) {
	router.Get("/", h.ListEvents)
	router.Get("/search", h.ListEvents) // same handler, uses query params
	router.Get("/categories", h.GetCategories)
	router.Get("/key/:eventKey", h.GetByEventKey)
	router.Get("/:id", h.GetByID)
}

func (h *Handler) RegisterProtectedRoutes(router fiber.Router) {
	router.Get("/me", h.ListMyEvents)
	router.Post("/", h.CreateEvent)
	router.Put("/:id", h.UpdateEvent)
	router.Delete("/:id", h.DeleteEvent)
}

// GET /api/v1/events
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

// GET /api/v1/events/categories
func (h *Handler) GetCategories(c *fiber.Ctx) error {
	categories, err := h.service.GetCategories(c.Context())
	if err != nil {
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to get categories")
	}

	return shared.Success(c, fiber.StatusOK, fiber.Map{"categories": categories})
}

// GET /api/v1/events/:id
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

// GET /api/v1/events/key/:eventKey
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

// GET /api/v1/events/me (organizer only)
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

// POST /api/v1/events (organizer only)
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

// PUT /api/v1/events/:id (organizer owner only)
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

// DELETE /api/v1/events/:id (organizer owner only)
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
