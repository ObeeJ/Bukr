package auth

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository handles all auth-related database operations.
type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// ── User auth records ─────────────────────────────────────────────────────────

type userAuthRow struct {
	ID           string
	Email        string
	Name         string
	UserType     string
	PasswordHash string
	IsActive     bool
}

// GetUserByEmail fetches the minimal auth record needed to verify a login.
func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*userAuthRow, error) {
	row := &userAuthRow{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, email, name, user_type, COALESCE(password_hash,''), is_active
		 FROM users WHERE email = $1`,
		email,
	).Scan(&row.ID, &row.Email, &row.Name, &row.UserType, &row.PasswordHash, &row.IsActive)
	if err != nil {
		return nil, err
	}
	return row, nil
}

// CreateUser inserts a new user and returns their ID and user_type.
func (r *Repository) CreateUser(ctx context.Context, name, email, passwordHash, userType string, orgName *string) (id string, err error) {
	err = r.db.QueryRow(ctx,
		`INSERT INTO users (name, email, password_hash, user_type, org_name, email_verified, is_active)
		 VALUES ($1, $2, $3, $4, $5, false, true)
		 RETURNING id::text`,
		name, email, passwordHash, userType, orgName,
	).Scan(&id)
	return
}

// SetRefreshToken stores the hashed refresh token for a user.
func (r *Repository) SetRefreshToken(ctx context.Context, userID, hash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET refresh_token_hash = $1, last_login_at = NOW() WHERE id = $2`,
		hash, userID,
	)
	return err
}

// GetRefreshTokenHash returns the stored refresh token hash for a user.
func (r *Repository) GetRefreshTokenHash(ctx context.Context, userID string) (hash string, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT COALESCE(refresh_token_hash,'') FROM users WHERE id = $1 AND is_active = true`,
		userID,
	).Scan(&hash)
	return
}

// GetUserIDByRefreshHash finds a user by their stored refresh token hash.
// Used for cold session restore when the client only has the cookie.
func (r *Repository) GetUserIDByRefreshHash(ctx context.Context, hash string) (string, error) {
	var id string
	err := r.db.QueryRow(ctx,
		`SELECT id::text FROM users WHERE refresh_token_hash = $1 AND is_active = true`,
		hash,
	).Scan(&id)
	return id, err
}

// ClearRefreshToken removes the refresh token on logout.
func (r *Repository) ClearRefreshToken(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET refresh_token_hash = NULL WHERE id = $1`,
		userID,
	)
	return err
}

// SetOTP stores a bcrypt-hashed OTP with a 10-minute expiry.
func (r *Repository) SetOTP(ctx context.Context, email, otpHash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users
		 SET otp_hash = $1, otp_expires_at = NOW() + INTERVAL '10 minutes', otp_attempts = 0
		 WHERE email = $2`,
		otpHash, email,
	)
	return err
}

type otpRow struct {
	UserID    string
	Name      string
	OTPHash   string
	ExpiresAt time.Time
	Attempts  int
}

// GetOTPRow fetches the OTP verification data for a given email.
func (r *Repository) GetOTPRow(ctx context.Context, email string) (*otpRow, error) {
	row := &otpRow{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, name, COALESCE(otp_hash,''), COALESCE(otp_expires_at, NOW()-INTERVAL '1s'), otp_attempts
		 FROM users WHERE email = $1 AND is_active = true`,
		email,
	).Scan(&row.UserID, &row.Name, &row.OTPHash, &row.ExpiresAt, &row.Attempts)
	if err != nil {
		return nil, err
	}
	return row, nil
}

// IncrementOTPAttempts bumps the attempt counter.
func (r *Repository) IncrementOTPAttempts(ctx context.Context, email string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users SET otp_attempts = otp_attempts + 1 WHERE email = $1`,
		email,
	)
	return err
}

// ResetPassword updates the password hash and invalidates all sessions.
func (r *Repository) ResetPassword(ctx context.Context, email, passwordHash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE users
		 SET password_hash = $1,
		     otp_hash = NULL,
		     otp_expires_at = NULL,
		     otp_attempts = 0,
		     refresh_token_hash = NULL
		 WHERE email = $2`,
		passwordHash, email,
	)
	return err
}

// GetUserByID returns the minimal auth row needed to issue a new token pair on refresh.
func (r *Repository) GetUserByID(ctx context.Context, userID string) (*userAuthRow, error) {
	row := &userAuthRow{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, email, name, user_type, COALESCE(password_hash,''), is_active
		 FROM users WHERE id = $1`,
		userID,
	).Scan(&row.ID, &row.Email, &row.Name, &row.UserType, &row.PasswordHash, &row.IsActive)
	if err != nil {
		return nil, err
	}
	return row, nil
}

// ── Admin auth records ────────────────────────────────────────────────────────

type adminAuthRow struct {
	ID           string
	Email        string
	Name         string
	PasswordHash string
	IsActive     bool
}

// GetAdminByEmail fetches the admin auth record.
func (r *Repository) GetAdminByEmail(ctx context.Context, email string) (*adminAuthRow, error) {
	row := &adminAuthRow{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, email, name, password_hash, is_active
		 FROM admin_users WHERE email = $1`,
		email,
	).Scan(&row.ID, &row.Email, &row.Name, &row.PasswordHash, &row.IsActive)
	if err != nil {
		return nil, err
	}
	return row, nil
}

// SetAdminRefreshToken stores the hashed refresh token for an admin.
func (r *Repository) SetAdminRefreshToken(ctx context.Context, adminID, hash string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE admin_users SET refresh_token_hash = $1, last_login_at = NOW() WHERE id = $2`,
		hash, adminID,
	)
	return err
}

// GetAdminRefreshTokenHash returns the stored refresh token hash for an admin.
func (r *Repository) GetAdminRefreshTokenHash(ctx context.Context, adminID string) (hash string, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT COALESCE(refresh_token_hash,'') FROM admin_users WHERE id = $1 AND is_active = true`,
		adminID,
	).Scan(&hash)
	return
}

// ClearAdminRefreshToken removes the admin refresh token on logout.
func (r *Repository) ClearAdminRefreshToken(ctx context.Context, adminID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE admin_users SET refresh_token_hash = NULL WHERE id = $1`,
		adminID,
	)
	return err
}

// GetAdminByID returns the admin row needed for token refresh.
func (r *Repository) GetAdminByID(ctx context.Context, adminID string) (*adminAuthRow, error) {
	row := &adminAuthRow{}
	err := r.db.QueryRow(ctx,
		`SELECT id::text, email, name, password_hash, is_active
		 FROM admin_users WHERE id = $1`,
		adminID,
	).Scan(&row.ID, &row.Email, &row.Name, &row.PasswordHash, &row.IsActive)
	if err != nil {
		return nil, err
	}
	return row, nil
}
