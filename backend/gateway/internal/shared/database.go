/**
 * INFRASTRUCTURE LAYER - Database Connection Pool
 * 
 * Database Pool: The connection manager - keeping database connections warm and ready
 * 
 * Architecture Layer: Infrastructure (Layer 6)
 * Dependencies: PostgreSQL (via pgx)
 * Responsibility: Create, configure, and manage database connection pool
 * 
 * Why connection pooling? Because:
 * 1. Opening connections is expensive (TCP handshake, SSL, auth)
 * 2. Databases have connection limits
 * 3. Reusing connections is 10x faster
 * 
 * Think of it as keeping a fleet of taxis ready instead of
 * calling one from the garage every time
 */

package shared

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

/**
 * NewDatabasePool: Create a PostgreSQL connection pool
 * 
 * Configuration:
 * - MaxConns: 20 (maximum concurrent connections)
 * - MinConns: 5 (keep this many warm)
 * - MaxConnLifetime: 30 minutes (recycle old connections)
 * - MaxConnIdleTime: 5 minutes (close idle connections)
 * 
 * Why these numbers?
 * - 20 max: Enough for moderate load, won't overwhelm database
 * - 5 min: Always have connections ready, avoid cold starts
 * - 30 min lifetime: Prevent stale connections
 * - 5 min idle: Free up resources when not busy
 * 
 * Behavior:
 * - Request comes in -> grab connection from pool
 * - Do database work -> return connection to pool
 * - Pool empty? -> wait for available connection
 * - Connection old? -> close and create new one
 * 
 * @param databaseURL - PostgreSQL connection string (postgres://user:pass@host/db)
 * @returns Connection pool or nil if URL not provided
 */
func NewDatabasePool(databaseURL string) *pgxpool.Pool {
	// Check if database URL provided
	if databaseURL == "" {
		log.Println("WARNING: No DATABASE_URL provided, skipping database connection")
		return nil  // Return nil - app can run without database in dev mode
	}

	// Create context with timeout - don't wait forever for connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Parse connection string into config
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatalf("Failed to parse DATABASE_URL: %v", err)
		// Fatal because invalid URL means misconfiguration
	}

	// Configure pool settings - tuned for production use
	config.MaxConns = 20                      // Maximum 20 concurrent connections
	config.MinConns = 5                       // Keep 5 connections warm
	config.MaxConnLifetime = 30 * time.Minute // Recycle connections after 30 min
	config.MaxConnIdleTime = 5 * time.Minute  // Close idle connections after 5 min

	// Create the connection pool
	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		log.Fatalf("Failed to create connection pool: %v", err)
		// Fatal because without database, app can't function properly
	}

	// Ping database to verify connection works
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
		// Fatal because connection exists but database unreachable
	}

	log.Println("Database connection pool established")
	return pool
}
