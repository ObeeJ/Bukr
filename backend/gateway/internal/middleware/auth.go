package middleware

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/bukr/gateway/internal/auth"
	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

// UserClaims is the resolved identity attached to every authenticated request.
type UserClaims struct {
	UserID    string
	Email     string
	UserType  string
	JTI       string
	ExpiresAt *time.Time
}

const (
	LocalsUserClaims  = "user_claims"
	LocalsAdminClaims = "admin_claims"
	LocalsUserID      = "user_id"
)

// l1Cache is a process-local JTI blacklist cache (30s TTL).
// It sits in front of Redis to avoid a network hop on every request.
var (
	l1Blacklist    sync.Map
	l1BlacklistTTL = 30 * time.Second
)

type blacklistEntry struct {
	expiresAt time.Time
}

// RequireAuth validates the user access token, checks the JTI blacklist,
// and verifies the device fingerprint. No database hit on the hot path.
func RequireAuth(appSecret string, rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := extractBearer(c)
		if tokenStr == "" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Missing authorization header")
		}

		claims, err := auth.ParseToken(appSecret, tokenStr)
		if err != nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid or expired token")
		}

		// Admin tokens must not pass user middleware — different secret means
		// this check is redundant, but defence-in-depth costs nothing.
		if claims.IsAdmin {
			return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Admin tokens are not valid here")
		}

		// JTI blacklist check (logout / password reset invalidation).
		if isRevoked(c.Context(), rdb, claims.JTI) {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Token has been revoked")
		}

		// Device fingerprint check — soft validation.
		// A mismatch means the token was likely stolen and replayed from another device.
		fp := auth.Fingerprint(c.Get("User-Agent"), c.IP())
		if claims.FP != "" && claims.FP != fp {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Token fingerprint mismatch")
		}

		var exp *time.Time
		if claims.ExpiresAt != nil {
			t := claims.ExpiresAt.Time
			exp = &t
		}

		c.Locals(LocalsUserClaims, &UserClaims{
			UserID:    claims.UserID,
			Email:     claims.Email,
			UserType:  claims.UserType,
			JTI:       claims.JTI,
			ExpiresAt: exp,
		})
		c.Locals(LocalsUserID, claims.UserID)
		return c.Next()
	}
}

// RequireAdmin validates the admin access token using the separate admin secret.
func RequireAdmin(adminSecret string, rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := extractBearer(c)
		if tokenStr == "" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Missing authorization header")
		}

		claims, err := auth.ParseToken(adminSecret, tokenStr)
		if err != nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid or expired admin token")
		}

		if !claims.IsAdmin {
			return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Not an admin token")
		}

		if isRevoked(c.Context(), rdb, claims.JTI) {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Token has been revoked")
		}

		var exp *time.Time
		if claims.ExpiresAt != nil {
			t := claims.ExpiresAt.Time
			exp = &t
		}

		c.Locals(LocalsAdminClaims, &UserClaims{
			UserID:    claims.UserID,
			Email:     claims.Email,
			UserType:  "admin",
			JTI:       claims.JTI,
			ExpiresAt: exp,
		})
		c.Locals(LocalsUserID, claims.UserID)
		return c.Next()
	}
}

// RequireOrganizer must be chained after RequireAuth.
func RequireOrganizer() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims := GetUserClaims(c)
		if claims == nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
		}
		if claims.UserType != "organizer" {
			return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Organizer access required")
		}
		return c.Next()
	}
}

// GetUserClaims extracts user claims from the request context.
func GetUserClaims(c *fiber.Ctx) *UserClaims {
	claims, _ := c.Locals(LocalsUserClaims).(*UserClaims)
	return claims
}

// GetAdminClaims extracts admin claims from the request context.
func GetAdminClaims(c *fiber.Ctx) *UserClaims {
	claims, _ := c.Locals(LocalsAdminClaims).(*UserClaims)
	return claims
}

// isRevoked checks the L1 in-process cache first, then Redis.
func isRevoked(ctx context.Context, rdb *redis.Client, jti string) bool {
	if jti == "" {
		return false
	}
	key := "jti:revoked:" + jti

	// L1 check
	if v, ok := l1Blacklist.Load(key); ok {
		entry := v.(blacklistEntry)
		if time.Now().Before(entry.expiresAt) {
			return true
		}
		l1Blacklist.Delete(key)
	}

	// Redis check
	if rdb != nil {
		val, err := rdb.Get(ctx, key).Result()
		if err == nil && val == "1" {
			l1Blacklist.Store(key, blacklistEntry{expiresAt: time.Now().Add(l1BlacklistTTL)})
			return true
		}
	}
	return false
}

func extractBearer(c *fiber.Ctx) string {
	h := c.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return parts[1]
}

// InvalidateUserCache is kept for compatibility with existing callers.
// With our own JWT there is no user-resolve cache to invalidate — the
// user_type lives in the token itself. This is a no-op.
func InvalidateUserCache(_ context.Context, _ *redis.Client, _ string) {}

// FetchSupabasePublicKey is removed. Left as a compile-time tombstone so
// any remaining callers produce a clear error rather than a silent nil.
func FetchSupabasePublicKey(_ string) error {
	return fmt.Errorf("FetchSupabasePublicKey: Supabase auth has been replaced with native JWT auth")
}
