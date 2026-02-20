/**
 * MIDDLEWARE LAYER - CORS Configuration
 * 
 * CORS Middleware: The border control - deciding which origins can access our API
 * 
 * Architecture Layer: Middleware (Layer 7)
 * Dependencies: Fiber CORS middleware
 * Responsibility: Configure Cross-Origin Resource Sharing
 * 
 * Why CORS? Because browsers are paranoid (for good reason)
 * By default, browsers block requests from different origins
 * We need to explicitly allow our frontend to talk to our backend
 * 
 * Security note: Only allow trusted origins in production
 */

package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

/**
 * SetupCORS: Configure CORS middleware
 * 
 * Configuration:
 * - AllowOrigins: Which domains can access our API
 * - AllowMethods: Which HTTP methods are allowed
 * - AllowHeaders: Which headers can be sent
 * - AllowCredentials: Allow cookies/auth headers
 * - MaxAge: How long browsers can cache CORS preflight
 * 
 * How CORS works:
 * 1. Browser sends OPTIONS request (preflight)
 * 2. Server responds with allowed origins/methods/headers
 * 3. Browser caches response for MaxAge seconds
 * 4. Browser allows actual request if origin matches
 * 
 * @param allowedOrigins - Comma-separated list of allowed origins
 * @returns Fiber middleware handler
 */
func SetupCORS(allowedOrigins string) fiber.Handler {
	return cors.New(cors.Config{
		// Which origins can access our API
		// Example: "https://bukr.netlify.app,http://localhost:5173"
		AllowOrigins:     allowedOrigins,
		
		// Which HTTP methods are allowed
		// GET for reading, POST for creating, PUT/PATCH for updating, DELETE for deleting
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		
		// Which headers can be sent in requests
		// Authorization: JWT tokens
		// Content-Type: JSON payloads
		// X-Request-ID: Request tracing
		AllowHeaders:     "Authorization,Content-Type,X-Request-ID",
		
		// Allow credentials (cookies, authorization headers)
		// Required for JWT authentication
		AllowCredentials: true,
		
		// Cache preflight response for 1 hour
		// Reduces OPTIONS requests - improves performance
		MaxAge:           3600,
	})
}
