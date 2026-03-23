package auth

import (
	"errors"
	"strings"
	"time"

	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
)

const refreshCookie = "bukr_refresh"
const adminRefreshCookie = "bukr_admin_refresh"

// Handler exposes all auth HTTP endpoints.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes mounts user auth endpoints under the given router.
// These are all public (no auth middleware).
func (h *Handler) RegisterRoutes(router fiber.Router) {
	router.Post("/register", h.Register)
	router.Post("/login", h.Login)
	router.Post("/refresh", h.Refresh)
	router.Post("/logout", h.Logout)
	router.Post("/forgot-password", h.ForgotPassword)
	router.Post("/reset-password", h.ResetPassword)
}

// RegisterAdminRoutes mounts admin auth endpoints.
func (h *Handler) RegisterAdminRoutes(router fiber.Router) {
	router.Post("/login", h.AdminLogin)
	router.Post("/refresh", h.AdminRefresh)
	router.Post("/logout", h.AdminLogout)
}

// ── User endpoints ────────────────────────────────────────────────────────────

// Register godoc
// POST /api/v1/auth/register
func (h *Handler) Register(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	fp := Fingerprint(c.Get("User-Agent"), c.IP())
	pair, refreshRaw, err := h.svc.Register(c.Context(), req, fp)
	if err != nil {
		return h.mapError(c, err)
	}

	setRefreshCookie(c, refreshCookie, refreshRaw, int(RefreshTokenTTL.Seconds()))
	return shared.Success(c, fiber.StatusCreated, pair)
}

// Login godoc
// POST /api/v1/auth/login
func (h *Handler) Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	fp := Fingerprint(c.Get("User-Agent"), c.IP())
	pair, refreshRaw, err := h.svc.Login(c.Context(), req, fp)
	if err != nil {
		return h.mapError(c, err)
	}

	setRefreshCookie(c, refreshCookie, refreshRaw, int(RefreshTokenTTL.Seconds()))
	return shared.Success(c, fiber.StatusOK, pair)
}

// Refresh godoc
// POST /api/v1/auth/refresh
// Reads refresh token from httpOnly cookie; falls back to JSON body.
// userID is always taken from the request body — the access token may be expired.
func (h *Handler) Refresh(c *fiber.Ctx) error {
	var body struct {
		RefreshToken string `json:"refresh_token"`
		UserID       string `json:"user_id"`
	}
	_ = c.BodyParser(&body)

	rawRefresh := c.Cookies(refreshCookie)
	if rawRefresh == "" {
		rawRefresh = body.RefreshToken
	}
	if rawRefresh == "" {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "No refresh token")
	}

	// If user_id is empty the client is doing a cold session restore from cookie.
	// Resolve the user from the token hash so we don't need the ID up-front.
	userID := body.UserID
	if userID == "" {
		resolved, err := h.svc.ResolveUserFromRefreshToken(c.Context(), rawRefresh)
		if err != nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid or expired session")
		}
		userID = resolved
	}

	fp := Fingerprint(c.Get("User-Agent"), c.IP())
	pair, newRaw, err := h.svc.Refresh(c.Context(), userID, rawRefresh, fp)
	if err != nil {
		return h.mapError(c, err)
	}
	setRefreshCookie(c, refreshCookie, newRaw, int(RefreshTokenTTL.Seconds()))
	return shared.Success(c, fiber.StatusOK, pair)
}

// Logout godoc
// POST /api/v1/auth/logout
// Accepts optional JSON body with user_id and jti for blacklisting.
func (h *Handler) Logout(c *fiber.Ctx) error {
	var body struct {
		UserID string `json:"user_id"`
		JTI    string `json:"jti"`
	}
	_ = c.BodyParser(&body)
	if body.UserID != "" {
		h.svc.Logout(c.Context(), body.UserID, body.JTI, time.Now().Add(AccessTokenTTL)) //nolint:errcheck
	}
	clearCookie(c, refreshCookie)
	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Signed out successfully"})
}

// ForgotPassword godoc
// POST /api/v1/auth/forgot-password
func (h *Handler) ForgotPassword(c *fiber.Ctx) error {
	var req ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if err := h.svc.ForgotPassword(c.Context(), req.Email); err != nil {
		if errors.Is(err, ErrOTPRateLimited) {
			return shared.Error(c, fiber.StatusTooManyRequests, shared.CodeRateLimited, err.Error())
		}
		// All other errors are swallowed — never reveal whether the email exists.
	}

	// Always return success to prevent email enumeration.
	return shared.Success(c, fiber.StatusOK, fiber.Map{
		"message": "If an account with that email exists, a reset code is on its way.",
	})
}

// ResetPassword godoc
// POST /api/v1/auth/reset-password
func (h *Handler) ResetPassword(c *fiber.Ctx) error {
	var req ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if err := h.svc.ResetPassword(c.Context(), req); err != nil {
		return h.mapError(c, err)
	}

	// Clear any lingering refresh cookie after a password reset.
	clearCookie(c, refreshCookie)
	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Password updated. Sign in with your new credentials."})
}

// ── Admin endpoints ───────────────────────────────────────────────────────────

// AdminLogin godoc
// POST /api/v1/admin/auth/login
func (h *Handler) AdminLogin(c *fiber.Ctx) error {
	var req AdminLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, "Invalid request body")
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	fp := Fingerprint(c.Get("User-Agent"), c.IP())
	pair, refreshRaw, err := h.svc.AdminLogin(c.Context(), req, fp)
	if err != nil {
		return h.mapError(c, err)
	}

	setRefreshCookie(c, adminRefreshCookie, refreshRaw, int(RefreshTokenTTL.Seconds()))
	return shared.Success(c, fiber.StatusOK, pair)
}

// AdminRefresh godoc
// POST /api/v1/admin/auth/refresh
func (h *Handler) AdminRefresh(c *fiber.Ctx) error {
	var body struct {
		AdminID string `json:"admin_id"`
	}
	_ = c.BodyParser(&body)

	rawRefresh := c.Cookies(adminRefreshCookie)
	if rawRefresh == "" || body.AdminID == "" {
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Refresh token and admin_id required")
	}

	pair, newRaw, err := h.svc.AdminRefresh(c.Context(), body.AdminID, rawRefresh)
	if err != nil {
		return h.mapError(c, err)
	}
	setRefreshCookie(c, adminRefreshCookie, newRaw, int(RefreshTokenTTL.Seconds()))
	return shared.Success(c, fiber.StatusOK, pair)
}

// AdminLogout godoc
// POST /api/v1/admin/auth/logout
func (h *Handler) AdminLogout(c *fiber.Ctx) error {
	var body struct {
		AdminID string `json:"admin_id"`
		JTI     string `json:"jti"`
	}
	_ = c.BodyParser(&body)
	if body.AdminID != "" {
		h.svc.AdminLogout(c.Context(), body.AdminID, body.JTI, time.Now().Add(AdminTokenTTL)) //nolint:errcheck
	}
	clearCookie(c, adminRefreshCookie)
	return shared.Success(c, fiber.StatusOK, fiber.Map{"message": "Signed out successfully"})
}

// ── Helpers ───────────────────────────────────────────────────────────────────

func setRefreshCookie(c *fiber.Ctx, name, value string, maxAge int) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    value,
		MaxAge:   maxAge,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		Path:     "/",
	})
}

func clearCookie(c *fiber.Ctx, name string) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    "",
		MaxAge:   -1,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		Path:     "/",
	})
}

// mapError translates service-layer sentinel errors to HTTP responses.
func (h *Handler) mapError(c *fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrInvalidCredentials):
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, err.Error())
	case errors.Is(err, ErrEmailTaken):
		return shared.Error(c, fiber.StatusConflict, shared.CodeConflict, err.Error())
	case errors.Is(err, ErrAccountDisabled):
		return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, err.Error())
	case errors.Is(err, ErrInvalidToken):
		return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, err.Error())
	case errors.Is(err, ErrInvalidOTP), errors.Is(err, ErrOTPExpired), errors.Is(err, ErrOTPMaxAttempts):
		return shared.Error(c, fiber.StatusUnprocessableEntity, shared.CodeValidationError, err.Error())
	case errors.Is(err, ErrOTPRateLimited):
		return shared.Error(c, fiber.StatusTooManyRequests, shared.CodeRateLimited, err.Error())
	case errors.Is(err, ErrWeakPassword), errors.Is(err, ErrValidation):
		return shared.Error(c, fiber.StatusBadRequest, shared.CodeValidationError, err.Error())
	default:
		return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Something went wrong")
	}
}
