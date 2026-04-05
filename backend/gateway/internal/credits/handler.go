package credits

import (
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc             *Service
	paystackSecret  string // for webhook signature verification
}

func NewHandler(svc *Service, paystackSecret string) *Handler {
	return &Handler{svc: svc, paystackSecret: paystackSecret}
}

// RegisterRoutes mounts all credits endpoints.
// Webhook is registered separately (no auth) via RegisterWebhook.
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Get("/me", h.GetMyCredits)
	router.Post("/purchase", h.Purchase)
}

func (h *Handler) RegisterWebhook(router fiber.Router) {
	router.Post("/webhook/credits", h.Webhook)
}

// GET /api/v1/credits/me
// Returns active pack + history for the authenticated organizer.
func (h *Handler) GetMyCredits(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	resp, err := h.svc.GetMyCredits(c.Context(), claims.UserID)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to load credits")
	}
	return shared.Success(c, 200, resp)
}

// POST /api/v1/credits/purchase
// Initiates Paystack payment for a credit pack.
// Returns authorization_url — frontend redirects buyer there.
func (h *Handler) Purchase(c *fiber.Ctx) error {
	claims := middleware.GetUserClaims(c)
	if claims == nil {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Authentication required")
	}

	var req PurchaseRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, "Invalid request body")
	}
	if _, ok := GetPackDef(req.PackType); !ok {
		return shared.Error(c, 400, shared.CodeValidationError, "Invalid pack type. Choose: single, growth, pro_pack, annual")
	}

	result, err := h.svc.InitiatePurchase(
		c.Context(),
		claims.UserID,
		claims.Email,
		req.PackType,
		req.CallbackURL,
	)
	if err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to initiate payment")
	}
	return shared.Success(c, 200, result)
}

// POST /api/v1/payments/webhook/credits  (public — no auth middleware)
// Paystack calls this when credit pack payment succeeds.
// Verifies HMAC-SHA512 signature before activating the pack.
func (h *Handler) Webhook(c *fiber.Ctx) error {
	sig := c.Get("x-paystack-signature")
	body := c.Body()

	// Always verify signature — reject unsigned requests immediately
	if !h.verifySignature(body, sig) {
		return shared.Error(c, 401, shared.CodeUnauthorized, "Invalid webhook signature")
	}

	var payload struct {
		Event string `json:"event"`
		Data  struct {
			Reference string `json:"reference"`
			Status    string `json:"status"`
			Metadata  struct {
				Type string `json:"type"`
			} `json:"metadata"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return shared.Error(c, 400, shared.CodeValidationError, "Invalid payload")
	}

	// Only process successful credit pack payments
	if payload.Event != "charge.success" ||
		payload.Data.Status != "success" ||
		payload.Data.Metadata.Type != "credit_pack" {
		// Return 200 so Paystack stops retrying — we just don't act on it
		return c.Status(200).JSON(fiber.Map{"status": "ignored"})
	}

	if err := h.svc.ConfirmPayment(c.Context(), payload.Data.Reference); err != nil {
		return shared.Error(c, 500, shared.CodeInternalError, "Failed to activate pack")
	}

	return c.Status(200).JSON(fiber.Map{"status": "ok"})
}

func (h *Handler) verifySignature(body []byte, sig string) bool {
	if h.paystackSecret == "" {
		// Fail-closed: no secret = reject all webhooks.
		// An empty secret in production is a misconfiguration, not a free pass.
		return false
	}
	mac := hmac.New(sha512.New, []byte(h.paystackSecret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}
