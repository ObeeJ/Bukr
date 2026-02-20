/**
 * DOMAIN LAYER - Error Definitions
 * 
 * Shared Errors: The vocabulary of failures - every way things can go wrong
 * 
 * Architecture Layer: Domain (Layer 4)
 * Dependencies: None (pure domain)
 * Responsibility: Define standard errors and error codes
 * 
 * Why centralize errors? Because consistency matters
 * Every module uses the same error codes - frontend knows what to expect
 */

package shared

import "errors"

/**
 * Standard error variables - reusable across modules
 * 
 * These are sentinel errors - you can check with errors.Is()
 * Example: if errors.Is(err, ErrNotFound) { ... }
 */
var (
	// 404 errors - resource doesn't exist
	ErrNotFound         = errors.New("resource not found")
	
	// 401 error - authentication required
	ErrUnauthorized     = errors.New("unauthorized")
	
	// 403 error - authenticated but not allowed
	ErrForbidden        = errors.New("forbidden")
	
	// 409 error - resource conflict
	ErrConflict         = errors.New("resource already exists")
	
	// 400 error - validation failed
	ErrValidation       = errors.New("validation failed")
	
	// 409 error - sold out
	ErrTicketsExhausted = errors.New("no tickets available")
	
	// 400 error - invalid promo code
	ErrPromoInvalid     = errors.New("promo code is invalid")
	
	// 402 error - payment failed
	ErrPaymentFailed    = errors.New("payment processing failed")
	
	// 429 error - too many requests
	ErrRateLimited      = errors.New("too many requests")
)

/**
 * Error code constants - machine-readable error identifiers
 * 
 * These match the codes in Rust backend - consistency across services
 * Frontend uses these codes to show appropriate error messages
 * 
 * Pattern: CODE_SNAKE_CASE for constants
 */
const (
	CodeValidationError  = "VALIDATION_ERROR"   // Bad request data
	CodeUnauthorized     = "UNAUTHORIZED"        // Missing or invalid auth
	CodeForbidden        = "FORBIDDEN"           // Not allowed
	CodeNotFound         = "NOT_FOUND"           // Resource doesn't exist
	CodeConflict         = "CONFLICT"            // Resource conflict
	CodeTicketsExhausted = "TICKETS_EXHAUSTED"   // Sold out
	CodePromoInvalid     = "PROMO_INVALID"       // Invalid promo code
	CodePaymentFailed    = "PAYMENT_FAILED"      // Payment error
	CodeRateLimited      = "RATE_LIMITED"        // Too many requests
	CodeInternalError    = "INTERNAL_ERROR"      // Server error
)
