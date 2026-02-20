/**
 * DOMAIN LAYER - API Response Structures
 * 
 * Response Helpers: The envelope makers - wrapping data in consistent formats
 * 
 * Architecture Layer: Domain (Layer 4)
 * Dependencies: Fiber (web framework)
 * Responsibility: Define standard response formats, provide helper functions
 * 
 * Why standard responses? Because consistency is beautiful
 * Every endpoint returns the same structure - frontend parsing is trivial
 */

package shared

import "github.com/gofiber/fiber/v2"

/**
 * APIResponse: The standard envelope for all API responses
 * 
 * Structure:
 * {
 *   "status": "success" | "error",
 *   "data": { ... },           // Present on success
 *   "error": { ... }           // Present on error
 * }
 * 
 * Why this structure? Because it's predictable
 * Frontend always knows: check status, then look at data or error
 */
type APIResponse struct {
	Status string      `json:"status"`              // "success" or "error"
	Data   interface{} `json:"data,omitempty"`     // Response data (success only)
	Error  *APIError   `json:"error,omitempty"`    // Error details (error only)
}

/**
 * APIError: Detailed error information
 * 
 * Contains:
 * - code: Machine-readable error code (VALIDATION_ERROR, NOT_FOUND, etc)
 * - message: Human-readable error message
 * - details: Optional field-level validation errors
 */
type APIError struct {
	Code    string        `json:"code"`              // Error code constant
	Message string        `json:"message"`          // Error message
	Details []FieldError  `json:"details,omitempty"` // Field validation errors
}

/**
 * FieldError: Individual field validation error
 * 
 * Used for form validation - tells frontend exactly which field is wrong
 * Example: {"field": "email", "message": "Invalid email format"}
 */
type FieldError struct {
	Field   string `json:"field"`    // Field name that failed validation
	Message string `json:"message"`  // What's wrong with it
}

/**
 * PaginationMeta: Pagination information for list endpoints
 * 
 * Tells frontend:
 * - What page they're on
 * - How many items per page
 * - Total items available
 * - Total pages available
 * 
 * Frontend uses this to render pagination controls
 */
type PaginationMeta struct {
	Page       int `json:"page"`         // Current page number (1-indexed)
	Limit      int `json:"limit"`        // Items per page
	Total      int `json:"total"`        // Total items across all pages
	TotalPages int `json:"total_pages"`  // Total number of pages
}

/**
 * Success: Helper function for success responses
 * 
 * Wraps data in standard success envelope
 * Usage: return shared.Success(c, 200, userData)
 * 
 * @param c - Fiber context
 * @param status - HTTP status code (200, 201, etc)
 * @param data - Response data (will be JSON serialized)
 * @returns Fiber error (nil on success)
 */
func Success(c *fiber.Ctx, status int, data interface{}) error {
	return c.Status(status).JSON(APIResponse{
		Status: "success",
		Data:   data,
	})
}

/**
 * Error: Helper function for error responses
 * 
 * Wraps error in standard error envelope
 * Usage: return shared.Error(c, 404, shared.CodeNotFound, "User not found")
 * 
 * @param c - Fiber context
 * @param status - HTTP status code (400, 404, 500, etc)
 * @param code - Error code constant (CodeNotFound, CodeValidationError, etc)
 * @param message - Human-readable error message
 * @returns Fiber error (nil on success)
 */
func Error(c *fiber.Ctx, status int, code string, message string) error {
	return c.Status(status).JSON(APIResponse{
		Status: "error",
		Error: &APIError{
			Code:    code,
			Message: message,
		},
	})
}

/**
 * ValidationError: Helper for validation error responses
 * 
 * Special case of error response with field-level details
 * Usage: return shared.ValidationError(c, []shared.FieldError{{Field: "email", Message: "Invalid"}})
 * 
 * Always returns 400 Bad Request
 * Frontend can show errors next to specific form fields
 * 
 * @param c - Fiber context
 * @param details - Array of field errors
 * @returns Fiber error (nil on success)
 */
func ValidationError(c *fiber.Ctx, details []FieldError) error {
	return c.Status(fiber.StatusBadRequest).JSON(APIResponse{
		Status: "error",
		Error: &APIError{
			Code:    "VALIDATION_ERROR",
			Message: "Request validation failed",
			Details: details,
		},
	})
}
