/**
 * INFRASTRUCTURE LAYER - Rust Service Proxy Client
 * 
 * RustProxy: The bridge - connecting Go Gateway to Rust Core
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: HTTP client, Fiber context
 * Responsibility: Forward requests to Rust backend with auth headers
 * 
 * Why Proxy?
 * - Polyglot architecture: Go for CRUD, Rust for high-throughput
 * - Seamless forwarding: Client doesn't know about backend split
 * - Auth injection: Go validates JWT, Rust gets user headers
 * 
 * Flow:
 * 1. Request hits Go Gateway
 * 2. Auth middleware validates JWT
 * 3. Proxy extracts user claims
 * 4. Forwards to Rust with X-User-ID, X-User-Email, X-User-Type
 * 5. Rust processes without re-validating JWT
 * 6. Response returned to client
 * 
 * Forwarded Headers:
 * - X-User-ID: Internal user ID
 * - X-User-Email: User email
 * - X-User-Type: "user" or "organizer"
 * - X-Paystack-Signature: Webhook verification
 */

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
// A single shared http.Client with a tuned Transport is used for all requests.
// This keeps TCP connections alive between calls instead of dialing fresh each time.
type RustProxy struct {
	baseURL       string
	gatewaySecret string
	client        *http.Client
}

func NewRustProxy(rustServiceURL string, gatewaySecret string) *RustProxy {
	// Transport is the connection pool. All proxy calls go to one host (Rust),
	// so MaxIdleConnsPerHost is set high to match expected concurrency.
	// DisableCompression avoids CPU overhead — JSON payloads are already small.
	transport := &http.Transport{
		MaxIdleConns:        512,
		MaxIdleConnsPerHost: 512, // All traffic goes to one host
		IdleConnTimeout:     90 * time.Second,
		DisableCompression:  true,
		// These match Go's defaults but are explicit for auditability:
		TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
	return &RustProxy{
		baseURL:       rustServiceURL,
		gatewaySecret: gatewaySecret,
		client: &http.Client{
			// 10s is generous for an internal service call.
			// If Rust takes >10s something is seriously wrong.
			Timeout:   10 * time.Second,
			Transport: transport,
		},
	}
}

/**
 * Forward: Proxy request to Rust backend
 * 
 * Flow:
 * 1. Build target URL with query string
 * 2. Create HTTP request with body
 * 3. Copy relevant headers
 * 4. Inject user claims as X-User-* headers
 * 5. Execute request
 * 6. Return response to client
 * 
 * @param c - Fiber context (incoming request)
 * @param rustPath - Target path on Rust service
 * @returns Proxied response or error
 */
func (p *RustProxy) Forward(c *fiber.Ctx, rustPath string) error {
	// Build target URL
	targetURL := fmt.Sprintf("%s%s", p.baseURL, rustPath)

	// Append query string if present
	if qs := string(c.Request().URI().QueryString()); qs != "" {
		targetURL = targetURL + "?" + qs
	}

	// Prepare request body
	var body io.Reader
	if len(c.Body()) > 0 {
		body = bytes.NewReader(c.Body())
	}

	// Create HTTP request
	req, err := http.NewRequestWithContext(c.Context(), c.Method(), targetURL, body)
	if err != nil {
		return shared.Error(c, fiber.StatusBadGateway, shared.CodeInternalError, "Failed to create proxy request")
	}

	// Copy content headers; fall back to application/json so Axum's JSON
	// extractor never rejects a forwarded request with 415.
	ct := string(c.Request().Header.ContentType())
	if ct == "" {
		ct = "application/json"
	}
	req.Header.Set("Content-Type", ct)
	if accept := c.Get("Accept"); accept != "" {
		req.Header.Set("Accept", accept)
	}

	// Forward Authorization header (optional, Rust may use it)
	if auth := c.Get("Authorization"); auth != "" {
		req.Header.Set("Authorization", auth)
	}

	// Inject gateway secret for Rust trust boundary
	req.Header.Set("X-Gateway-Secret", p.gatewaySecret)

	// Inject user claims from Go Gateway auth
	// Rust trusts these headers (no JWT re-validation)
	if claims := middleware.GetUserClaims(c); claims != nil {
		req.Header.Set("X-User-ID", claims.UserID)
		req.Header.Set("X-User-Email", claims.Email)
		req.Header.Set("X-User-Type", claims.UserType)
	}

	// Forward Paystack webhook signature for verification
	if sig := c.Get("X-Paystack-Signature"); sig != "" {
		req.Header.Set("X-Paystack-Signature", sig)
	}

	// Execute proxied request
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

	// Copy response Content-Type header
	contentType := resp.Header.Get("Content-Type")
	if contentType != "" {
		c.Set("Content-Type", contentType)
	}

	// Return proxied response
	return c.Status(resp.StatusCode).Send(respBody)
}
