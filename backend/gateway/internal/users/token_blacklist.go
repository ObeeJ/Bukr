/**
 * INFRASTRUCTURE LAYER - JWT Token Blacklist
 *
 * High-level: Allows the app to explicitly revoke a JWT before it naturally
 * expires — used for logout flows where you want immediate invalidation
 * rather than waiting for the token’s exp claim.
 *
 * Low-level: Stores revoked token strings as Redis keys with a TTL matching
 * the token’s remaining lifetime. On each auth check, IsRevoked() does a
 * single Redis GET — O(1), sub-millisecond. If Redis is unavailable the
 * blacklist degrades gracefully: RevokeToken returns an error (caller logs it)
 * and IsRevoked returns false (token is treated as valid — acceptable tradeoff
 * for optional infrastructure).
 */
package users

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenBlacklist manages revoked JWTs in Redis.
// Keyed as `revoked:token:<token>` with a TTL so entries self-clean.
type TokenBlacklist struct {
	rdb *redis.Client
}

// NewTokenBlacklist creates a new blacklist backed by the given Redis client.
func NewTokenBlacklist(rdb *redis.Client) *TokenBlacklist {
	return &TokenBlacklist{rdb: rdb}
}

// RevokeToken marks a token as invalid for the duration of expiresIn.
// The TTL should match the token’s remaining lifetime so Redis auto-cleans it.
func (tb *TokenBlacklist) RevokeToken(ctx context.Context, token string, expiresIn time.Duration) error {
	if tb.rdb == nil {
		return fmt.Errorf("redis not available")
	}
	
	key := fmt.Sprintf("revoked:token:%s", token)
	return tb.rdb.Set(ctx, key, "1", expiresIn).Err()
}

// IsRevoked returns true if the token has been explicitly revoked.
// Returns false (not revoked) when Redis is unavailable — graceful degradation.
func (tb *TokenBlacklist) IsRevoked(ctx context.Context, token string) bool {
	if tb.rdb == nil {
		return false // Graceful degradation
	}
	
	key := fmt.Sprintf("revoked:token:%s", token)
	val, err := tb.rdb.Get(ctx, key).Result()
	return err == nil && val == "1"
}

// Logout revokes a user's token
// Usage: blacklist := NewTokenBlacklist(redisClient)
//        blacklist.RevokeToken(ctx, token, 24*time.Hour)
