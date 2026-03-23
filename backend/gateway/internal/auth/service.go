package auth

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"
	"unicode"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

// Service contains all auth business logic.
type Service struct {
	repo        *Repository
	mailer      *Mailer
	rdb         *redis.Client
	appSecret   string
	adminSecret string
}

func NewService(repo *Repository, mailer *Mailer, rdb *redis.Client, appSecret, adminSecret string) *Service {
	return &Service{
		repo:        repo,
		mailer:      mailer,
		rdb:         rdb,
		appSecret:   appSecret,
		adminSecret: adminSecret,
	}
}

// ── Register ──────────────────────────────────────────────────────────────────

func (s *Service) Register(ctx context.Context, req RegisterRequest, fp string) (*TokenPair, string, error) {
	if err := validateRegister(req); err != nil {
		return nil, "", err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return nil, "", fmt.Errorf("hash password: %w", err)
	}

	userID, err := s.repo.CreateUser(ctx, req.Name, req.Email, string(hash), req.UserType, req.OrgName)
	if err != nil {
		// Postgres unique violation code 23505
		if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "unique") {
			return nil, "", ErrEmailTaken
		}
		return nil, "", fmt.Errorf("create user: %w", err)
	}

	pair, refreshRaw, err := s.issuePair(ctx, userID, req.Email, req.UserType, fp, false)
	if err != nil {
		return nil, "", err
	}

	// Welcome email is fire-and-forget — a mail failure must never block registration.
	go s.mailer.SendWelcome(req.Email, req.Name) //nolint:errcheck

	return pair, refreshRaw, nil
}

// ── Login ─────────────────────────────────────────────────────────────────────

func (s *Service) Login(ctx context.Context, req LoginRequest, fp string) (*TokenPair, string, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		// Constant-time response — do not reveal whether the email exists.
		bcrypt.CompareHashAndPassword([]byte("$2a$12$dummy"), []byte(req.Password)) //nolint:errcheck
		return nil, "", ErrInvalidCredentials
	}
	if !user.IsActive {
		return nil, "", ErrAccountDisabled
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, "", ErrInvalidCredentials
	}

	pair, refreshRaw, err := s.issuePair(ctx, user.ID, user.Email, user.UserType, fp, false)
	if err != nil {
		return nil, "", err
	}
	return pair, refreshRaw, nil
}

// ── Refresh ───────────────────────────────────────────────────────────────────

func (s *Service) Refresh(ctx context.Context, userID, rawRefreshToken, fp string) (*TokenPair, string, error) {
	storedHash, err := s.repo.GetRefreshTokenHash(ctx, userID)
	if err != nil || storedHash == "" {
		return nil, "", ErrInvalidToken
	}
	if HashToken(rawRefreshToken) != storedHash {
		return nil, "", ErrInvalidToken
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || !user.IsActive {
		return nil, "", ErrInvalidToken
	}

	pair, refreshRaw, err := s.issuePair(ctx, user.ID, user.Email, user.UserType, fp, false)
	if err != nil {
		return nil, "", err
	}
	return pair, refreshRaw, nil
}

// ── ResolveUserFromRefreshToken ──────────────────────────────────────────────

// ResolveUserFromRefreshToken finds the user whose stored refresh hash matches
// the raw token. Used for cold session restore when user_id is not yet known.
func (s *Service) ResolveUserFromRefreshToken(ctx context.Context, rawToken string) (string, error) {
	hash := HashToken(rawToken)
	return s.repo.GetUserIDByRefreshHash(ctx, hash)
}

// ── Logout ────────────────────────────────────────────────────────────────────

// Logout invalidates the refresh token in DB and blacklists the access token JTI in Redis.
func (s *Service) Logout(ctx context.Context, userID, jti string, exp time.Time) error {
	_ = s.repo.ClearRefreshToken(ctx, userID)
	if s.rdb != nil && jti != "" {
		ttl := time.Until(exp)
		if ttl > 0 {
			s.rdb.Set(ctx, "jti:revoked:"+jti, "1", ttl) //nolint:errcheck
		}
	}
	return nil
}

// ── Forgot Password ───────────────────────────────────────────────────────────

func (s *Service) ForgotPassword(ctx context.Context, email string) error {
	// Rate-limit: 3 OTP requests per email per hour via Redis.
	if s.rdb != nil {
		key := "otp:rate:" + email
		count, _ := s.rdb.Incr(ctx, key).Result()
		if count == 1 {
			s.rdb.Expire(ctx, key, time.Hour) //nolint:errcheck
		}
		if count > 3 {
			return ErrOTPRateLimited
		}
	}

	// Fetch user — but always return success to the caller to prevent email enumeration.
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return nil // silent — do not reveal whether email exists
	}

	otp := generateOTP()
	hash, err := bcrypt.GenerateFromPassword([]byte(otp), bcryptCost)
	if err != nil {
		return fmt.Errorf("hash otp: %w", err)
	}

	if err := s.repo.SetOTP(ctx, email, string(hash)); err != nil {
		return fmt.Errorf("set otp: %w", err)
	}

	go s.mailer.SendOTP(email, user.Name, otp) //nolint:errcheck
	return nil
}

// ── Reset Password ────────────────────────────────────────────────────────────

func (s *Service) ResetPassword(ctx context.Context, req ResetPasswordRequest) error {
	if len(req.Password) < 8 {
		return ErrWeakPassword
	}

	row, err := s.repo.GetOTPRow(ctx, req.Email)
	if err != nil {
		return ErrInvalidOTP
	}
	if row.OTPHash == "" {
		return ErrInvalidOTP
	}
	if time.Now().After(row.ExpiresAt) {
		return ErrOTPExpired
	}
	if row.Attempts >= 3 {
		return ErrOTPMaxAttempts
	}

	if err := bcrypt.CompareHashAndPassword([]byte(row.OTPHash), []byte(req.OTP)); err != nil {
		_ = s.repo.IncrementOTPAttempts(ctx, req.Email)
		return ErrInvalidOTP
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcryptCost)
	if err != nil {
		return fmt.Errorf("hash password: %w", err)
	}

	// ResetPassword also clears refresh_token_hash — all sessions are killed.
	if err := s.repo.ResetPassword(ctx, req.Email, string(newHash)); err != nil {
		return fmt.Errorf("reset password: %w", err)
	}

	return nil
}

// ── Admin Login ───────────────────────────────────────────────────────────────

func (s *Service) AdminLogin(ctx context.Context, req AdminLoginRequest, fp string) (*TokenPair, string, error) {
	admin, err := s.repo.GetAdminByEmail(ctx, req.Email)
	if err != nil {
		bcrypt.CompareHashAndPassword([]byte("$2a$12$dummy"), []byte(req.Password)) //nolint:errcheck
		return nil, "", ErrInvalidCredentials
	}
	if !admin.IsActive {
		return nil, "", ErrAccountDisabled
	}
	if err := bcrypt.CompareHashAndPassword([]byte(admin.PasswordHash), []byte(req.Password)); err != nil {
		return nil, "", ErrInvalidCredentials
	}

	pair, refreshRaw, err := s.issueAdminPair(ctx, admin.ID, admin.Email)
	if err != nil {
		return nil, "", err
	}
	return pair, refreshRaw, nil
}

// ── Admin Refresh ─────────────────────────────────────────────────────────────

func (s *Service) AdminRefresh(ctx context.Context, adminID, rawRefreshToken string) (*TokenPair, string, error) {
	storedHash, err := s.repo.GetAdminRefreshTokenHash(ctx, adminID)
	if err != nil || storedHash == "" {
		return nil, "", ErrInvalidToken
	}
	if HashToken(rawRefreshToken) != storedHash {
		return nil, "", ErrInvalidToken
	}

	admin, err := s.repo.GetAdminByID(ctx, adminID)
	if err != nil || !admin.IsActive {
		return nil, "", ErrInvalidToken
	}

	pair, refreshRaw, err := s.issueAdminPair(ctx, admin.ID, admin.Email)
	if err != nil {
		return nil, "", err
	}
	return pair, refreshRaw, nil
}

// ── Admin Logout ──────────────────────────────────────────────────────────────

func (s *Service) AdminLogout(ctx context.Context, adminID, jti string, exp time.Time) error {
	_ = s.repo.ClearAdminRefreshToken(ctx, adminID)
	if s.rdb != nil && jti != "" {
		ttl := time.Until(exp)
		if ttl > 0 {
			s.rdb.Set(ctx, "jti:revoked:"+jti, "1", ttl) //nolint:errcheck
		}
	}
	return nil
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// issuePair generates a new access+refresh token pair, stores the refresh hash,
// and returns the raw refresh token to be set as a cookie.
func (s *Service) issuePair(ctx context.Context, userID, email, userType, fp string, isAdmin bool) (*TokenPair, string, error) {
	accessToken, _, err := IssueAccessToken(s.appSecret, userID, email, userType, fp)
	if err != nil {
		return nil, "", fmt.Errorf("issue access token: %w", err)
	}

	rawRefresh, refreshHash, err := NewRefreshToken()
	if err != nil {
		return nil, "", fmt.Errorf("issue refresh token: %w", err)
	}

	if err := s.repo.SetRefreshToken(ctx, userID, refreshHash); err != nil {
		return nil, "", fmt.Errorf("store refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken: accessToken,
		ExpiresIn:   int(AccessTokenTTL.Seconds()),
		UserType:    userType,
		UserID:      userID,
	}, rawRefresh, nil
}

func (s *Service) issueAdminPair(ctx context.Context, adminID, email string) (*TokenPair, string, error) {
	accessToken, _, err := IssueAdminAccessToken(s.adminSecret, adminID, email)
	if err != nil {
		return nil, "", fmt.Errorf("issue admin access token: %w", err)
	}

	rawRefresh, refreshHash, err := NewRefreshToken()
	if err != nil {
		return nil, "", fmt.Errorf("issue admin refresh token: %w", err)
	}

	if err := s.repo.SetAdminRefreshToken(ctx, adminID, refreshHash); err != nil {
		return nil, "", fmt.Errorf("store admin refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken: accessToken,
		ExpiresIn:   int(AdminTokenTTL.Seconds()),
		UserType:    "admin",
		UserID:      adminID,
	}, rawRefresh, nil
}

// generateOTP returns a cryptographically random 6-digit string.
func generateOTP() string {
	n, _ := rand.Int(rand.Reader, big.NewInt(1_000_000))
	return fmt.Sprintf("%06d", n.Int64())
}

// validateRegister enforces registration business rules.
func validateRegister(req RegisterRequest) error {
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Name = strings.TrimSpace(req.Name)

	if req.Name == "" {
		return fmt.Errorf("%w: name is required", ErrValidation)
	}
	if !strings.Contains(req.Email, "@") {
		return fmt.Errorf("%w: invalid email", ErrValidation)
	}
	if err := validatePassword(req.Password); err != nil {
		return err
	}
	if req.UserType != "user" && req.UserType != "organizer" {
		return fmt.Errorf("%w: user_type must be user or organizer", ErrValidation)
	}
	if req.UserType == "organizer" && (req.OrgName == nil || strings.TrimSpace(*req.OrgName) == "") {
		return fmt.Errorf("%w: org_name is required for organizers", ErrValidation)
	}
	return nil
}

func validatePassword(pw string) error {
	if len(pw) < 8 {
		return fmt.Errorf("%w: password must be at least 8 characters", ErrWeakPassword)
	}
	var hasUpper, hasDigit bool
	for _, c := range pw {
		if unicode.IsUpper(c) {
			hasUpper = true
		}
		if unicode.IsDigit(c) {
			hasDigit = true
		}
	}
	if !hasUpper || !hasDigit {
		return fmt.Errorf("%w: password must contain at least one uppercase letter and one number", ErrWeakPassword)
	}
	return nil
}
