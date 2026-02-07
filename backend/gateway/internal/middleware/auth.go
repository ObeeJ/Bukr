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

type UserClaims struct {
	UserID   string `json:"user_id"`
	Email    string `json:"email"`
	UserType string `json:"user_type"`
}

const (
	LocalsUserClaims = "user_claims"
	LocalsUserID     = "user_id"
)

// RequireAuth validates the Supabase JWT and attaches user claims to context.
// On first authenticated request, it auto-creates a users row if one doesn't exist.
func RequireAuth(jwtSecret string, db *pgxpool.Pool) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Missing authorization header")
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid authorization format")
		}

		tokenString := parts[1]

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(jwtSecret), nil
		})

		if err != nil || !token.Valid {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid or expired token")
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid token claims")
		}

		supabaseUID, _ := claims["sub"].(string)
		email, _ := claims["email"].(string)

		if supabaseUID == "" {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Invalid token: missing subject")
		}

		// Look up our internal user by supabase_uid
		userClaims, err := resolveUser(c.Context(), db, supabaseUID, email)
		if err != nil {
			return shared.Error(c, fiber.StatusInternalServerError, shared.CodeInternalError, "Failed to resolve user")
		}

		c.Locals(LocalsUserClaims, userClaims)
		c.Locals(LocalsUserID, userClaims.UserID)

		return c.Next()
	}
}

// RequireOrganizer checks that the authenticated user has organizer role.
func RequireOrganizer() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := c.Locals(LocalsUserClaims).(*UserClaims)
		if !ok || claims == nil {
			return shared.Error(c, fiber.StatusUnauthorized, shared.CodeUnauthorized, "Authentication required")
		}

		if claims.UserType != "organizer" {
			return shared.Error(c, fiber.StatusForbidden, shared.CodeForbidden, "Organizer access required")
		}

		return c.Next()
	}
}

// GetUserClaims extracts the authenticated user's claims from fiber context.
func GetUserClaims(c *fiber.Ctx) *UserClaims {
	claims, _ := c.Locals(LocalsUserClaims).(*UserClaims)
	return claims
}

// resolveUser looks up or auto-creates the internal users row for a Supabase auth user.
func resolveUser(ctx context.Context, db *pgxpool.Pool, supabaseUID, email string) (*UserClaims, error) {
	if db == nil {
		return &UserClaims{
			UserID:   supabaseUID,
			Email:    email,
			UserType: "user",
		}, nil
	}

	var userID, userType string

	err := db.QueryRow(ctx,
		`SELECT id::text, user_type FROM users WHERE supabase_uid = $1`,
		supabaseUID,
	).Scan(&userID, &userType)

	if err != nil {
		// User doesn't exist yet — auto-create from JWT claims
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

	return &UserClaims{
		UserID:   userID,
		Email:    email,
		UserType: userType,
	}, nil
}
