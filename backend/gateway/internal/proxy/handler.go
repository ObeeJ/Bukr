/**
 * CONTROLLER LAYER - Proxy HTTP Handlers
 * 
 * Proxy Handler: The traffic director - forwarding requests to Rust backend
 * 
 * Architecture Layer: Controller (Layer 2)
 * Dependencies: RustProxy client (HTTP forwarding)
 * Responsibility: Route registration and request forwarding
 * 
 * Why Proxy Pattern?
 * - Go Gateway: Handles auth, CRUD, user-facing operations
 * - Rust Core: Handles high-throughput operations (tickets, payments, scanner)
 * - Proxy: Seamless forwarding with auth headers
 * 
 * Forwarded Services:
 * - Tickets: Purchase, retrieval
 * - Scanner: QR validation, gate access
 * - Payments: Initialization, webhooks, verification
 * - Analytics: Event metrics, dashboard
 * 
 * Flow:
 * 1. Request hits Go Gateway
 * 2. Auth middleware validates JWT
 * 3. Proxy forwards to Rust with X-User-ID headers
 * 4. Rust processes request
 * 5. Response returned to client
 */

package proxy

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
)

/**
 * Handler: Proxy controller
 * Registers routes that forward to Rust backend
 */
type Handler struct {
	proxy *RustProxy    // HTTP client for forwarding
}

/**
 * NewHandler: Constructor
 */
func NewHandler(proxy *RustProxy) *Handler {
	return &Handler{proxy: proxy}
}

/**
 * RegisterTicketRoutes: Forward ticket endpoints to Rust
 * 
 * Routes:
 * - POST /purchase: Buy tickets
 * - GET /me: Get user's tickets
 * - GET /event/:event_id: Get event tickets
 * - POST /claim-free: Claim free ticket
 */
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
	router.Post("/claim-free", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/tickets/claim-free")
	})
}

/**
 * RegisterScannerRoutes: Forward scanner endpoints to Rust
 * 
 * Routes:
 * - POST /verify-access: Verify scanner access code
 * - POST /validate: Validate ticket QR code
 * - POST /manual-validate: Manual ticket validation
 * - PATCH /mark-used/:ticket_id: Mark ticket as scanned
 * - GET /:event_id/stats: Get scanning statistics
 */
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

/**
 * RegisterPaymentRoutes: Forward payment endpoints to Rust
 * 
 * Routes:
 * - POST /initialize: Initialize payment with provider
 * - GET /:reference/verify: Verify payment status
 */
func (h *Handler) RegisterPaymentRoutes(router fiber.Router) {
	router.Post("/initialize", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/payments/initialize")
	})
	router.Get("/:reference/verify", func(c *fiber.Ctx) error {
		ref := c.Params("reference")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/payments/%s/verify", ref))
	})
}

/**
 * RegisterPaymentWebhooks: Forward webhook endpoints (no auth)
 * 
 * Routes:
 * - POST /webhook/paystack: Paystack payment confirmation
 * 
 * Note: Webhooks bypass auth middleware
 * Security via signature verification in Rust
 */
func (h *Handler) RegisterPaymentWebhooks(router fiber.Router) {
	router.Post("/webhook/paystack", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/payments/webhook/paystack")
	})
}

/**
 * RegisterAnalyticsRoutes: Forward analytics endpoints to Rust
 * 
 * Routes:
 * - GET /events/:event_id: Event-specific analytics
 * - GET /dashboard: Platform-wide summary
 */
func (h *Handler) RegisterAnalyticsRoutes(router fiber.Router) {
	router.Get("/events/:event_id", func(c *fiber.Ctx) error {
		eventID := c.Params("event_id")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/analytics/events/%s", eventID))
	})
	router.Get("/dashboard", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/analytics/dashboard")
	})
}

/**
 * RegisterPromoRoutes: Forward promo code endpoints to Rust
 * 
 * Routes:
 * - GET /event/:event_id: List promos for event
 * - POST /: Create promo code
 * - DELETE /:id: Delete promo code
 * - PATCH /:id/toggle: Toggle promo active status
 * - POST /validate: Validate promo code
 */
func (h *Handler) RegisterPromoRoutes(router fiber.Router) {
	router.Get("/event/:event_id", func(c *fiber.Ctx) error {
		eventID := c.Params("event_id")
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/events/%s/promos", eventID))
	})
	router.Post("/", func(c *fiber.Ctx) error {
		var body map[string]interface{}
		if err := c.BodyParser(&body); err != nil {
			return err
		}
		eventID, ok := body["event_id"].(string)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "event_id required"})
		}
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/events/%s/promos", eventID))
	})
	router.Delete("/:id", func(c *fiber.Ctx) error {
		promoID := c.Params("id")
		eventID := c.Query("event_id")
		if eventID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "event_id query param required"})
		}
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/events/%s/promos/%s", eventID, promoID))
	})
	router.Patch("/:id/toggle", func(c *fiber.Ctx) error {
		promoID := c.Params("id")
		eventID := c.Query("event_id")
		if eventID == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "event_id query param required"})
		}
		return h.proxy.Forward(c, fmt.Sprintf("/api/v1/events/%s/promos/%s/toggle", eventID, promoID))
	})
	router.Post("/validate", func(c *fiber.Ctx) error {
		return h.proxy.Forward(c, "/api/v1/promos/validate")
	})
}
