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
	"strings"
	"time"

	"github.com/bukr/gateway/internal/shared"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5/pgxpool"
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
	LocalsUserClaims = "user_claims"  // Full claims object
	LocalsUserID     = "user_id"      // Just the ID for convenience
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
func RequireAuth(jwtSecret string, db *pgxpool.Pool) fiber.Handler {
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
		// This checks signature, expiration, and claims structure
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Verify signing method is HMAC (what Supabase uses)
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			// Return secret for signature verification
			return []byte(jwtSecret), nil
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

		// Step 5: Resolve user in our database
		// This links Supabase auth user to our internal user record
		userClaims, err := resolveUser(c.Context(), db, supabaseUID, email)
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
func resolveUser(ctx context.Context, db *pgxpool.Pool, supabaseUID, email string) (*UserClaims, error) {
	// If no database, return minimal claims (dev mode)
	if db == nil {
		return &UserClaims{
			UserID:   supabaseUID,
			Email:    email,
			UserType: "user",
		}, nil
	}

	var userID, userType string

	// Try to find existing user by supabase_uid
	err := db.QueryRow(ctx,
		`SELECT id::text, user_type FROM users WHERE supabase_uid = $1`,
		supabaseUID,
	).Scan(&userID, &userType)

	if err != nil {
		// User doesn't exist yet - auto-create from JWT claims
		// This is the "just-in-time provisioning" magic
		insertCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		// INSERT with ON CONFLICT - handles race conditions
		// If two requests come simultaneously, only one INSERT succeeds
		err = db.QueryRow(insertCtx,
			`INSERT INTO users (supabase_uid, email, name, user_type)
			 VALUES ($1, $2, $3, 'user')
			 ON CONFLICT (supabase_uid) DO UPDATE SET email = EXCLUDED.email
			 RETURNING id::text, user_type`,
			supabaseUID, email, email,  // Use email as default name
		).Scan(&userID, &userType)

		if err != nil {
			return nil, err
		}
	}

	// Return claims with our internal user ID and type
	return &UserClaims{
		UserID:   userID,
		Email:    email,
		UserType: userType,
	}, nil
}
