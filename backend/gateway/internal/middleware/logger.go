/**
 * MIDDLEWARE LAYER - Request Logging
 * 
 * Logger Middleware: The security camera - recording every request that comes through
 * 
 * Architecture Layer: Middleware (Layer 7)
 * Dependencies: None (uses standard log package)
 * Responsibility: Log HTTP requests for debugging and monitoring
 * 
 * Why log requests? Because:
 * 1. Debugging - see what requests are coming in
 * 2. Monitoring - track response times
 * 3. Security - audit trail of API access
 * 4. Performance - identify slow endpoints
 * 
 * Log format: [METHOD] PATH IP STATUS DURATION
 * Example: [GET] /api/v1/events 192.168.1.1 200 45ms
 */

package middleware

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

/**
 * RequestLogger: Middleware that logs every HTTP request
 * 
 * Flow:
 * 1. Record start time
 * 2. Call next handler (process request)
 * 3. Calculate duration
 * 4. Log request details
 * 
 * Logged information:
 * - HTTP method (GET, POST, etc)
 * - Request path (/api/v1/events)
 * - Client IP address
 * - Response status code (200, 404, 500, etc)
 * - Request duration (how long it took)
 * 
 * Use cases:
 * - Debugging: "Why is this endpoint slow?"
 * - Monitoring: "How many requests per second?"
 * - Security: "Who's hitting our API?"
 * 
 * @returns Fiber middleware handler
 */
func RequestLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Record start time - when request arrived
		start := time.Now()

		// Process the request - call next handler in chain
		err := c.Next()

		// Log request details after processing
		// Format: [METHOD] PATH IP STATUS DURATION
		log.Printf("[%s] %s %s %d %s",
			c.Method(),                      // HTTP method (GET, POST, etc)
			c.Path(),                        // Request path (/api/v1/events)
			c.IP(),                          // Client IP address
			c.Response().StatusCode(),       // HTTP status code (200, 404, etc)
			time.Since(start),               // How long request took
		)

		// Return any error from handler
		return err
	}
}
