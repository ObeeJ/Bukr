/**
 * MIDDLEWARE LAYER - Cross-Cutting Concerns
 * 
 * Auth Middleware: The bouncer at Bukr's door - nobody gets in without proper ID
 * 
 * Architecture Layer: Middleware (Layer 7)
 * Dependencies: Supabase JWT, Database (Infrastructure)
 * Responsibility: Validate JWTs, extract user claims, enforce authorization
 * 
 * This is where security happens - every protected route goes through here
 * Think of it as airport security but for API requests
 */

package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

/**
 * UserClaims: The VIP pass - what we know about the authenticated user
 * 
 * Extracted from JWT and attached to request context
 * Every handler can access this to know who's making the request
 */
type UserClaims struct {
	UserID   string `json:"user_id"`    // Our internal user UUID
	Email    string `json:"email"`      // User's email
	UserType string `json:"user_type"` // "user" or "organizer"
}

// Context keys - where we store user info in the request context
const (
	LocalsUserClaims = "user_claims" // Full claims object
	LocalsUserID     = "user_id"     // Just the ID for convenience
)

// userCacheEntry holds a resolved user record with its expiry.
// Stored in Redis (distributed) and in a local sync.Map (L1 in-process cache).
type userCacheEntry struct {
	UserID   string
	UserType string
	ExpiresAt time.Time
}

// l1Cache is a process-local cache that sits in front of Redis.
// A cache hit here costs ~100ns vs ~500µs for a Redis round-trip.
// TTL is intentionally short (30s) so user_type changes propagate quickly.
var (
	l1Cache    sync.Map
	l1CacheTTL = 30 * time.Second
	redisCacheTTL = 5 * time.Minute
)

/**
 * RequireAuth: The main authentication middleware
 * 
 * What it does:
 * 1. Extracts JWT from Authorization header
 * 2. Validates JWT signature using Supabase secret
 * 3. Extracts user claims from JWT
 * 4. Looks up user in our database (or creates if first login)
 * 5. Attaches user claims to request context
 * 6. Calls next handler
 * 
 * If any step fails, returns 401 Unauthorized
 * 
 * @param jwtSecret - Supabase JWT secret for signature validation
 * @param db - Database pool for user lookup
 * @returns Fiber middleware handler
 */
// FetchSupabasePublicKey fetches the EC public key from Supabase JWKS endpoint.
// Called once at startup — cheap network call, cached for the lifetime of the process.
func FetchSupabasePublicKey(supabaseURL string) (*ecdsa.PublicKey, error) {
	resp, err := http.Get(supabaseURL + "/auth/v1/.well-known/jwks.json")
	if err != nil {
		return nil, fmt.Errorf("jwks fetch failed: %w", err)
	}
	defer resp.Body.Close()

	var jwks struct {
		Keys []struct {
			Kty string `json:"kty"`
			Crv string `json:"crv"`
			X   string `json:"x"`
			Y   string `json:"y"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return nil, fmt.Errorf("jwks decode failed: %w", err)
	}
	if len(jwks.Keys) == 0 {
		return nil, fmt.Errorf("no keys in jwks response")
	}

	k := jwks.Keys[0]
	xBytes, err := base64.RawURLEncoding.DecodeString(k.X)
	if err != nil {
		return nil, fmt.Errorf("jwks x decode: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(k.Y)
	if err != nil {
		return nil, fmt.Errorf("jwks y decode: %w", err)
	}

	return &ecdsa.PublicKey{
		Curve: elliptic.P256(),
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}, nil
}

// RequireAuth builds the auth middleware.
// rdb is optional — if nil, only the L1 in-process cache is used.
func RequireAuth(pubKey *ecdsa.PublicKey, db *pgxpool.Pool, rdb ...*redis.Client) fiber.Handler {
	var redisClient *redis.Client
	if len(rdb) > 0 {
		redisClient = rdb[0]
	}
	return func(c *fiber.Ctx) error {
		// Step 1: Extract Authorization header
		// Format: "Bearer <token>"
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Missing authorization header")
		}

		// Step 2: Parse header - must be "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid authorization format")
		}

		tokenString := parts[1]

		// Step 3: Parse and validate JWT
		// Supabase now issues ES256 (ECDSA P-256) tokens — verify against public key
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodECDSA); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return pubKey, nil
		})

		if err != nil || !token.Valid {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid or expired token")
		}

		// Step 4: Extract claims from JWT
		// Claims are the payload - who the user is, when token expires, etc
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid token claims")
		}

		// Extract Supabase user ID and email
		// "sub" (subject) is standard JWT claim for user ID
		supabaseUID, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)

		if supabaseUID == "" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid token: missing subject")
		}

		// Step 5: Resolve user — L1 cache → Redis → DB (in that order).
		// The DB is only hit on first request or after cache expiry.
		userClaims, err := resolveUser(c.Context(), db, redisClient, supabaseUID, email)
		if err != nil {
			return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to resolve user")
		}

		// Step 6: Attach user claims to request context
		// Now every handler can access user info via c.Locals()
		c.Locals(LocalsUserClaims, userClaims)
		c.Locals(LocalsUserID, userClaims.UserID)

		// Step 7: Continue to next handler - user is authenticated!
		return c.Next()
	}
}

/**
 * RequireOrganizer: Authorization middleware for organizer-only endpoints
 * 
 * Must be used AFTER RequireAuth - assumes user is already authenticated
 * Checks if user_type is "organizer"
 * 
 * Use case: Creating events, viewing analytics, managing promos
 * 
 * @returns Fiber middleware handler
 */
func RequireOrganizer() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Extract user claims from context (set by RequireAuth)
		claims, ok := c.Locals(LocalsUserClaims).(*UserClaims)
		if !ok || claims == nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
		}

		// Check user type - only organizers allowed
		if claims.UserType != "organizer" {
			return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Organizer access required")
		}

		// User is an organizer - proceed
		return c.Next()
	}
}

func RequireAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals(LocalsUserClaims).(*UserClaims)
		if !ok || claims == nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
		}
		if claims.UserType != "admin" {
			return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Admin access required")
		}
		return c.Next()
	}
}

/**
 * GetUserClaims: Helper to extract user claims from request context
 * 
 * Used by handlers to get current user info
 * Returns nil if user not authenticated (shouldn't happen if RequireAuth is used)
 * 
 * @param c - Fiber context
 * @returns UserClaims or nil
 */
func GetUserClaims(c *fiber.Ctx) *UserClaims {
	claims, _ := c.Locals(LocalsUserClaims).(*UserClaims)
	return claims
}

/**
 * resolveUser: Look up or auto-create user in our database
 * 
 * The magic of "just-in-time" user provisioning:
 * 1. User signs up with Supabase (creates auth record)
 * 2. On first API request, we create our internal user record
 * 3. Subsequent requests just look up existing record
 * 
 * Why? Because Supabase handles auth, we handle app data
 * Separation of concerns - auth provider vs app database
 * 
 * @param ctx - Request context
 * @param db - Database pool
 * @param supabaseUID - Supabase auth user ID
 * @param email - User's email
 * @returns UserClaims with our internal user ID and type
 */
// resolveUser resolves a Supabase UID to our internal user record.
// Cache hierarchy: L1 (sync.Map, 30s) → Redis (5min) → PostgreSQL.
// The DB is only hit on a user's very first request or after all caches expire.
func resolveUser(ctx context.Context, db *pgxpool.Pool, rdb *redis.Client, supabaseUID, email string) (*UserClaims, error) {
	if db == nil {
		return &UserClaims{UserID: supabaseUID, Email: email, UserType: "user"}, nil
	}

	cacheKey := "user:resolve:" + supabaseUID

	// ── L1: in-process sync.Map (sub-microsecond) ─────────────────────────────
	if v, ok := l1Cache.Load(cacheKey); ok {
		entry := v.(userCacheEntry)
		if time.Now().Before(entry.ExpiresAt) {
			return &UserClaims{UserID: entry.UserID, Email: email, UserType: entry.UserType}, nil
		}
		l1Cache.Delete(cacheKey) // expired
	}

	// ── L2: Redis (sub-millisecond, shared across instances) ──────────────────
	if rdb != nil {
		val, err := rdb.Get(ctx, cacheKey).Result()
		if err == nil && len(val) > 0 {
			// Stored as "userID:userType"
			parts := strings.SplitN(val, ":", 2)
			if len(parts) == 2 {
				entry := userCacheEntry{
					UserID:    parts[0],
					UserType:  parts[1],
					ExpiresAt: time.Now().Add(l1CacheTTL),
				}
				l1Cache.Store(cacheKey, entry)
				return &UserClaims{UserID: parts[0], Email: email, UserType: parts[1]}, nil
			}
		}
	}

	// ── L3: PostgreSQL (source of truth) ──────────────────────────────────────
	var userID, userType string
	err := db.QueryRow(ctx,
		`SELECT id::text, user_type FROM users WHERE supabase_uid = $1`,
		supabaseUID,
	).Scan(&userID, &userType)

	if err != nil {
		// First-ever login — provision the user record.
		// ON CONFLICT handles the race where two simultaneous requests both miss.
		insertCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()
		err = db.QueryRow(insertCtx,
			`INSERT INTO users (supabase_uid, email, name, user_type)
			 VALUES ($1, $2, $3, 'user')
			 ON CONFLICT (supabase_uid) DO UPDATE SET email = EXCLUDED.email
			 RETURNING id::text, user_type`,
			supabaseUID, email, email,
		).Scan(&userID, &userType)
		if err != nil {
			return nil, err
		}
	}

	// Populate both cache layers so subsequent requests never touch the DB.
	entry := userCacheEntry{
		UserID:    userID,
		UserType:  userType,
		ExpiresAt: time.Now().Add(l1CacheTTL),
	}
	l1Cache.Store(cacheKey, entry)
	if rdb != nil {
		// Fire-and-forget — a Redis write failure must never block the request.
		go rdb.Set(context.Background(), cacheKey, userID+":"+userType, redisCacheTTL)
	}

	return &UserClaims{UserID: userID, Email: email, UserType: userType}, nil
}

// InvalidateUserCache removes a user from both cache layers.
// Call this after a user_type change (e.g. user promoted to organizer).
func InvalidateUserCache(ctx context.Context, rdb *redis.Client, supabaseUID string) {
	cacheKey := "user:resolve:" + supabaseUID
	l1Cache.Delete(cacheKey)
	if rdb != nil {
		rdb.Del(ctx, cacheKey)
	}
}
