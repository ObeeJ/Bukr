package users

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// TokenBlacklist manages revoked tokens
type TokenBlacklist struct {
	rdb *redis.Client
}

// NewTokenBlacklist creates a new token blacklist
func NewTokenBlacklist(rdb *redis.Client) *TokenBlacklist {
	return &TokenBlacklist{rdb: rdb}
}

// RevokeToken adds a token to the blacklist
func (tb *TokenBlacklist) RevokeToken(ctx context.Context, token string, expiresIn time.Duration) error {
	if tb.rdb == nil {
		return fmt.Errorf("redis not available")
	}
	
	key := fmt.Sprintf("revoked:token:%s", token)
	return tb.rdb.Set(ctx, key, "1", expiresIn).Err()
}

// IsRevoked checks if a token is revoked
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
