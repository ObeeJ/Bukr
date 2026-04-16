package auth

// RegisterRequest is the payload for POST /api/v1/auth/register.
type RegisterRequest struct {
	Name           string  `json:"name"`
	Email          string  `json:"email"`
	Password       string  `json:"password"`
	UserType       string  `json:"user_type"`    // "user" | "organizer"
	OrgName        *string `json:"org_name"`
	// Optional: set by the frontend after a guest redeems an invite token.
	// When present, the referrer receives their reward after registration completes.
	SourceInviteID string  `json:"source_invite_id"`
}

// LoginRequest is the payload for POST /api/v1/auth/login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// ForgotPasswordRequest triggers OTP generation and email delivery.
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ResetPasswordRequest verifies the OTP and sets the new password.
type ResetPasswordRequest struct {
	Email    string `json:"email"`
	OTP      string `json:"otp"`
	Password string `json:"password"`
}

// TokenPair is returned on login and refresh.
type TokenPair struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"` // seconds
	UserType    string `json:"user_type"`
	UserID      string `json:"user_id"`
}

// AdminLoginRequest is the payload for POST /api/v1/admin/auth/login.
type AdminLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}
