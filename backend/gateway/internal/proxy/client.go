package proxy

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/bukr/gateway/internal/middleware"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

// RustProxy forwards requests from the Go gateway to the Rust core service.
type RustProxy struct {
	baseURL string
	client  *http.Client
}

// NewRustProxy creates a proxy client pointing at the Rust service.
func NewRustProxy(rustServiceURL string) *RustProxy {
	return &RustProxy{
		baseURL: rustServiceURL,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Forward proxies the incoming Fiber request to the Rust service, injecting
// the authenticated user's ID as an X-User-ID header.
func (p *RustProxy) Forward(c *fiber.Ctx, rustPath string) error {
	targetURL := fmt.Sprintf("%s%s", p.baseURL, rustPath)

	// Build query string
	if qs := string(c.Request().URI().QueryString()); qs != "" {
		targetURL = targetURL + "?" + qs
	}

	// Create the proxied request
	var body io.Reader
	if len(c.Body()) > 0 {
		body = bytes.NewReader(c.Body())
	}

	req, err := http.NewRequestWithContext(c.Context(), c.Method(), targetURL, body)
	if err != nil {
		return shared.Error(c, fiber.StatusBadGateway, shared.CodeInternalError, "Failed to create proxy request")
	}

	// Copy relevant headers
	req.Header.Set("Content-Type", string(c.Request().Header.ContentType()))
	if accept := c.Get("Accept"); accept != "" {
		req.Header.Set("Accept", accept)
	}

	// Forward the original Authorization header (Rust service may use it)
	if auth := c.Get("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	}

	// Inject user ID from gateway auth
	if claims := middleware.GetUserClaims(c); claims != nil {
		req.Header.Set("X-User-ID", claims.UserID)
		req.Header.Set("X-User-Email", claims.Email)
		req.Header.Set("X-User-Type", claims.UserType)
	}

	// Forward Paystack webhook signature if present
	if sig := c.Get("X-Paystack-Signature"); sig != "" {
		req.Header.Set("X-Paystack-Signature", sig)
	}

	// Execute request
	resp, err := p.client.Do(req)
	if err != nil {
		return shared.Error(c, fiber.StatusBadGateway, shared.CodeInternalError, "Rust service unavailable")
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return shared.Error(c, fiber.StatusBadGateway, shared.CodeInternalError, "Failed to read response from core service")
	}

	// Copy response headers
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" {
		c.Set("Content-Type", contentType)
	}

	return c.Status(resp.StatusCode).Send(respBody)
}
