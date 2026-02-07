package shared

import "errors"

var (
	ErrNotFound         = errors.New("resource not found")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrConflict         = errors.New("resource already exists")
	ErrValidation       = errors.New("validation failed")
	ErrTicketsExhausted = errors.New("no tickets available")
	ErrPromoInvalid     = errors.New("promo code is invalid")
	ErrPaymentFailed    = errors.New("payment processing failed")
	ErrRateLimited      = errors.New("too many requests")
)

// Error code constants matching the API error codes
const (
	CodeValidationError  = "VALIDATION_ERROR"
	CodeUnauthorized     = "UNAUTHORIZED"
	CodeForbidden        = "FORBIDDEN"
	CodeNotFound         = "NOT_FOUND"
	CodeConflict         = "CONFLICT"
	CodeTicketsExhausted = "TICKETS_EXHAUSTED"
	CodePromoInvalid     = "PROMO_INVALID"
	CodePaymentFailed    = "PAYMENT_FAILED"
	CodeRateLimited      = "RATE_LIMITED"
	CodeInternalError    = "INTERNAL_ERROR"
)
