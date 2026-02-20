/**
 * INFRASTRUCTURE LAYER - Redis Connection
 * 
 * Redis Client: The cache connector - for when database is too slow
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: Redis (via go-redis)
 * Responsibility: Create and configure Redis client for caching
 * 
 * Why Redis? Because:
 * 1. Database queries are slow (milliseconds)
 * 2. Redis is fast (microseconds)
 * 3. Some data doesn't change often (cache it!)
 * 
 * Use cases:
 * - Session storage
 * - Rate limiting counters
 * - Event list caching
 * - Ticket availability caching
 */

package shared

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

/**
 * NewRedisClient: Create a Redis client connection
 * 
 * Graceful degradation: If Redis unavailable, app still works
 * Caching is optional - app functions without it, just slower
 * 
 * Connection flow:
 * 1. Parse Redis URL
 * 2. Create client
 * 3. Ping to verify connection
 * 4. Return client or nil if failed
 * 
 * @param redisURL - Redis connection string (redis://user:pass@host:port/db)
 * @returns Redis client or nil if connection failed
 */
func NewRedisClient(redisURL string) *redis.Client {
	// Check if Redis URL provided
	if redisURL == "" {
		log.Println("WARNING: No REDIS_URL provided, skipping Redis connection")
		return nil  // Return nil - caching disabled but app works
	}

	// Parse Redis URL into options
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Failed to parse REDIS_URL: %v", err)
		// Fatal because invalid URL means misconfiguration
	}

	// Create Redis client
	client := redis.NewClient(opts)

	// Ping Redis to verify connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		// Don't fatal - Redis is optional
		// Log warning and return nil - app continues without caching
		log.Printf("WARNING: Redis connection failed: %v (caching disabled)", err)
		return nil
	}

	log.Println("Redis connection established")
	return client
}
