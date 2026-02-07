package proxy

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// Handler registers proxy routes that forward to the Rust core service.
type Handler struct {
	proxy *RustProxy
}

// NewHandler creates a proxy handler.
func NewHandler(proxy *RustProxy) *Handler {
	return &Handler{proxy: proxy}
}

// RegisterTicketRoutes forwards ticket endpoints to Rust.
func (h *Handler) RegisterTicketRoutes(router fiber.Router) {
	router.Post("/purchase", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/tickets/purchase")
	})
	router.Get("/me", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/tickets/me")
	})
	router.Get("/event/:event_id", func(c *fiber.Ctx) error {
		eventID := c.Params("event_id")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/tickets/event/%s", eventID))
	})
}

// RegisterScannerRoutes forwards scanner endpoints to Rust.
func (h *Handler) RegisterScannerRoutes(router fiber.Router) {
	router.Post("/verify-access", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/scanner/verify-access")
	})
	router.Post("/validate", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/scanner/validate")
	})
	router.Post("/manual-validate", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/scanner/manual-validate")
	})
	router.Patch("/mark-used/:ticket_id", func(c *fiber.Ctx) error {
		ticketID := c.Params("ticket_id")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/scanner/mark-used/%s", ticketID))
	})
	router.Get("/:event_id/stats", func(c *fiber.Ctx) error {
		eventID := c.Params("event_id")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/scanner/%s/stats", eventID))
	})
}

// RegisterPaymentRoutes forwards payment endpoints to Rust.
func (h *Handler) RegisterPaymentRoutes(router fiber.Router) {
	router.Post("/initialize", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/payments/initialize")
	})
	router.Get("/:reference/verify", func(c *fiber.Ctx) error {
		ref := c.Params("reference")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/payments/%s/verify", ref))
	})
}

// RegisterPaymentWebhooks registers unprotected webhook routes (no auth middleware).
func (h *Handler) RegisterPaymentWebhooks(router fiber.Router) {
	router.Post("/webhook/paystack", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/payments/webhook/paystack")
	})
}

// RegisterAnalyticsRoutes forwards analytics endpoints to Rust.
func (h *Handler) RegisterAnalyticsRoutes(router fiber.Router) {
	router.Get("/events/:event_id", func(c *fiber.Ctx) error {
		eventID := c.Params("event_id")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/analytics/events/%s", eventID))
	})
	router.Get("/dashboard", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/analytics/dashboard")
	})
}
