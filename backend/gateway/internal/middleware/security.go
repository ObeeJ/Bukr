package middleware

import "github.com/gofiber/fiber/v2"

// SecurityHeaders adds security headers to all responses
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Prevent MIME type sniffing
		c.Set("X-Content-Type-Options", "nosniff")
		
		// Prevent clickjacking
		c.Set("X-Frame-Options", "DENY")
		
		// Enable XSS protection
		c.Set("X-XSS-Protection", "1; mode=block")
		
		// Force HTTPS
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		
		// Content Security Policy
		c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
		
		// Referrer policy
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Permissions policy
		c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		
		return c.Next()
	}
}
