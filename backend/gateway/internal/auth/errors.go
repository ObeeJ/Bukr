package auth

import "errors"

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrEmailTaken         = errors.New("an account with this email already exists")
	ErrAccountDisabled    = errors.New("this account has been disabled")
	ErrInvalidToken       = errors.New("invalid or expired token")
	ErrInvalidOTP         = errors.New("invalid or expired reset code")
	ErrOTPExpired         = errors.New("reset code has expired")
	ErrOTPMaxAttempts     = errors.New("too many incorrect attempts — request a new code")
	ErrOTPRateLimited     = errors.New("too many reset requests — try again in an hour")
	ErrWeakPassword       = errors.New("password does not meet requirements")
	ErrValidation         = errors.New("validation error")
)
