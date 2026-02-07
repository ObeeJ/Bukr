package shared

import (
	"context"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient(redisURL string) *redis.Client {
	if redisURL == "" {
		log.Println("WARNING: No REDIS_URL provided, skipping Redis connection")
		return nil
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatalf("Failed to parse REDIS_URL: %v", err)
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("WARNING: Redis connection failed: %v (caching disabled)", err)
		return nil
	}

	log.Println("Redis connection established")
	return client
}
